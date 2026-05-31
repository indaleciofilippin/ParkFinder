import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("REBILL_API_KEY")

headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}

payload = {
    "customer": {
        "email": "test-e2e@parkfinder.com",
        "firstName": "Test",
        "lastName": "E2E"
    },
    "transaction": {
        "amount": 1500.0,
        "currency": "ARS",
        "quantity": 1,
        "name": "Test Charge",
        "card": {
            "cardNumber": "4111111111111111",
            "expirationMonth": "12",
            "expirationYear": "2028",
            "securityCode": "123",
            "holderName": "Test E2E"
        }
    }
}

print("probando POST /v3/checkout con raw card...")
resp = requests.post("https://api.rebill.com/v3/checkout", headers=headers, json=payload)
print("Status:", resp.status_code)
print("Response:", resp.text)
