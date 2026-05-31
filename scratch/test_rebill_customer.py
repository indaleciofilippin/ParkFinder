import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("REBILL_API_KEY")

headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}

print("probando POST /v3/customers...")
resp = requests.post("https://api.rebill.com/v3/customers", headers=headers, json={"email": "test@parkfinder.com", "firstName": "Test", "lastName": "User"})
print("Status:", resp.status_code)
print("Response:", resp.text)
