import os
import requests
from dotenv import load_dotenv

load_dotenv("Frontend/.env")
pk = os.getenv("EXPO_PUBLIC_REBILL_PUBLIC_KEY")

headers = {
    "x-api-key": pk,
    "Content-Type": "application/json"
}

print("\nprobando POST /v2/tokens con pk...")
resp = requests.post("https://api.rebill.com/v2/tokens", headers=headers, json={"cardNumber": "123"})
print("Status:", resp.status_code)
print("Response:", resp.text)
