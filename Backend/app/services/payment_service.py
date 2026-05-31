import requests
import os
import uuid
from typing import Optional, Dict, Any

class PaymentService:
    def __init__(self):
        self.api_key = os.getenv("REBILL_API_KEY", "")
        self.base_url = "https://api.rebill.com/v3"
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }

    def create_customer_and_save_card(self, email: str, card_token: str) -> Dict[str, str]:
        """
        Creates a Customer in Rebill (or gets existing via email) and associates the card token.
        Since Rebill tokenizes the card directly via the frontend SDK, the card_token here IS the Rebill card ID (crd_...).
        We just need to ensure the customer exists and return the IDs.
        """
        try:
            # Create or get customer
            payload = {
                "email": email,
                "firstName": email.split('@')[0],
                "lastName": "User"
            }
            
            print(f"📡 [REBILL] Creating/Fetching customer for {email}...")
            resp = requests.post(f"{self.base_url}/customers", headers=self.headers, json=payload)
            
            if resp.status_code == 400 and "exist" in resp.text.lower():
                # Customer already exists, fetch by email
                search_resp = requests.get(f"{self.base_url}/customers?search={email}", headers=self.headers)
                if search_resp.status_code == 200 and search_resp.json().get("data"):
                    customer_data = search_resp.json()["data"][0]
                else:
                    raise ValueError(f"Could not fetch existing customer: {search_resp.text}")
            elif resp.status_code not in (200, 201):
                raise ValueError(f"Could not create customer in Rebill. Status {resp.status_code}: {resp.text}")
            else:
                customer_data = resp.json()
                
            customer_id = customer_data.get("id")
            
            # The card_token passed from the frontend IS the Rebill Card ID (crd_...)
            card_id = card_token
            
            print(f"📡 [REBILL] Customer ID: {customer_id}, Card ID: {card_id}")
            
            return {
                "customer_id": customer_id,
                "card_id": card_id
            }
        except Exception as e:
            print(f"⚠️ [REBILL] SDK Error in create_customer_and_save_card: {e}")
            raise

    def charge_saved_card(
        self,
        customer_id: str,
        card_id: str,
        amount: float,
        payment_method_id: str,
        email: str
    ) -> Dict[str, Any]:
        """
        Charges the saved card of a customer in Rebill using the Checkout API.
        """
        try:
            idempotency_key = str(uuid.uuid4())
            
            # Rebill checkout payload
            payload = {
                "customer": {
                    "email": email,
                    "firstName": email.split('@')[0],
                    "lastName": "User"
                },
                "transaction": {
                    "amount": float(amount),
                    "currency": "ARS",
                    "quantity": 1,
                    "name": [{"text": "ParkFinder Parking Exit Charge", "language": "es"}],
                    "description": [{"text": "ParkFinder Parking Exit Charge", "language": "es"}]
                },
                "cardId": card_id
            }
            
            headers = self.headers.copy()
            headers["x-idempotency-key"] = idempotency_key
            
            print(f"📡 [REBILL] Executing checkout for amount {amount}...")
            resp = requests.post(f"{self.base_url}/checkout", headers=headers, json=payload)
            
            if resp.status_code not in (200, 201):
                # If there's an error, try an alternative structure just in case
                if resp.status_code == 400:
                    payload["cardTokenId"] = card_id
                    del payload["cardId"]
                    resp = requests.post(f"{self.base_url}/checkout", headers=headers, json=payload)
                    
                # Si despues de probar el fallback o si fue un 500, sigue fallando, tiramos el error
                if resp.status_code not in (200, 201):
                    raise ValueError(f"Rebill checkout failed. Status {resp.status_code}: {resp.text}")
            
            payment = resp.json()
            print(f"📡 [REBILL] Checkout response: {payment}")
            
            # Rebill typically returns the transaction ID and a status (e.g., "succeeded", "approved")
            # If the API returned 200/201 without errors, we assume the charge was successful.
            # You can adapt the status parsing based on the exact Rebill response format.
            transaction_id = payment.get("id", "rebill_tx_none")
            
            return {
                "status": "approved",
                "gateway_reference": transaction_id,
                "payment_method": "credit_card",
                "raw_response": payment
            }
        except Exception as e:
            print(f"⚠️ [REBILL] Error in charge_saved_card: {e}")
            raise
