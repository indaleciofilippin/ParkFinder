import os
import requests
from dotenv import load_dotenv

load_dotenv("Frontend/.env")
pk = os.getenv("EXPO_PUBLIC_REBILL_PUBLIC_KEY")

headers = {
    "x-api-key": pk,
    "Content-Type": "application/json"
}

# 1. Try to create a card token (just to see if pk_ works and what it expects)
print("probando POST /v3/cards con pk...")
resp = requests.post("https://api.rebill.com/v3/cards", headers=headers, json={})
print("Status:", resp.status_code)
print("Response:", resp.text)

print("\nprobando POST /v3/tokens con pk...")
resp2 = requests.post("https://api.rebill.com/v3/tokens", headers=headers, json={})
print("Status:", resp2.status_code)
print("Response:", resp2.text)
