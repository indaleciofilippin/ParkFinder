import mercadopago
import os
import uuid
from typing import Optional, Dict, Any

class PaymentService:
    def __init__(self):
        self.access_token = os.getenv("MP_ACCESS_TOKEN", "APP_USR-1234567890-test")
        self.sdk = mercadopago.SDK(self.access_token)

    def create_customer_and_save_card(self, email: str, card_token: str) -> Dict[str, str]:
        """
        Creates a Customer in Mercado Pago (or gets existing) and associates the card token.
        Returns a dict with customer_id and card_id.
        """
        try:
            # 1. Search for customer
            customer_search = self.sdk.customer().search({"email": email})
            results = customer_search.get("response", {}).get("results", [])
            
            if results:
                customer_id = results[0]["id"]
            else:
                # Create customer
                customer_response = self.sdk.customer().create({"email": email})
                customer_id = customer_response.get("response", {}).get("id")
                
            if not customer_id:
                error_detail = customer_response.get("response", {}) if 'customer_response' in locals() else customer_search.get("response", {})
                error_msg = error_detail.get("message") or error_detail.get("error") or "Unknown error"
                raise ValueError(f"Could not create or find customer in Mercado Pago: {error_msg}")
                
            # 2. Save card to customer
            card_response = self.sdk.card().create(customer_id, {"token": card_token})
            card_id = card_response.get("response", {}).get("id")
            
            if not card_id:
                error_detail = card_response.get("response", {})
                error_msg = error_detail.get("message") or error_detail.get("error") or str(card_response)
                raise ValueError(f"Could not associate card token to customer: {error_msg}")
                
            return {
                "customer_id": customer_id,
                "card_id": card_id
            }
        except Exception as e:
            print(f"⚠️ [MERCADO PAGO] SDK Error in create_customer_and_save_card: {e}")
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
        Charges the saved card of a customer in Mercado Pago.
        """
        try:
            idempotency_key = str(uuid.uuid4())
            payment_data = {
                "transaction_amount": float(amount),
                "description": "ParkFinder Parking Exit Charge",
                "installments": 1,
                "payment_method_id": payment_method_id,
                "token": card_id, # In MP, to charge a saved card, card_id is passed in the 'token' field
                "payer": {
                    "type": "customer",
                    "id": customer_id
                }
            }
            
            request_options = mercadopago.config.RequestOptions()
            request_options.custom_headers = {
                'x-idempotency-key': idempotency_key
            }
            
            payment_response = self.sdk.payment().create(payment_data, request_options)
            payment = payment_response.get("response", {})
            status = payment.get("status", "rejected")
            gateway_reference = str(payment.get("id", "none"))
            
            return {
                "status": "approved" if status == "approved" else "rejected",
                "gateway_reference": gateway_reference,
                "payment_method": payment_method_id,
                "raw_response": payment
            }
        except Exception as e:
            print(f"⚠️ [MERCADO PAGO] SDK Error in charge_saved_card: {e}")
            raise
