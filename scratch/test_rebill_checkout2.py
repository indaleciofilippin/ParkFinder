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
        "id": "test_cus_6b2f20cf5af94140a4ea16101152e492"
    },
    "transaction": {
        "amount": 100.0,
        "currency": "ARS",
        "description": "Test Parking Checkout"
    }
}

print("probando POST /v3/checkout con payload...")
resp = requests.post("https://api.rebill.com/v3/checkout", headers=headers, json=payload)
print("Status:", resp.status_code)
print("Response:", resp.text)
