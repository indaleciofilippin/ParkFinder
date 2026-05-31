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
        "description": [{"text": "Test Charge"}],
        "cardTokenId": "test_crd_123"
    }
}

resp = requests.post("https://api.rebill.com/v3/checkout", headers=headers, json=payload)
print("Status:", resp.status_code)
print("Response:", resp.text)
