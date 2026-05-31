import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("REBILL_API_KEY")

headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}

print("probando POST /v3/checkout...")
resp = requests.post("https://api.rebill.com/v3/checkout", headers=headers, json={})
print("Status:", resp.status_code)
print("Response:", resp.text)
