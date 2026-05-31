import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("REBILL_API_KEY")

headers_list = [
    {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    {"API_KEY": api_key, "Content-Type": "application/json"},
    {"x-api-key": api_key, "Content-Type": "application/json"},
    {"api_key": api_key, "Content-Type": "application/json"},
    {"Authorization": api_key, "Content-Type": "application/json"}
]

endpoints = [
    "https://api.rebill.com/v3/customers",
    "https://api.rebill.com/v2/customers",
    "https://api.rebill.com/v1/customers",
]

for url in endpoints:
    print(f"\n--- Probando URL: {url} ---")
    for hdrs in headers_list:
        print(f"Probando headers: {list(hdrs.keys())[0]}")
        resp = requests.get(url, headers=hdrs)
        print(f"Status: {resp.status_code}")
        if resp.status_code != 401:
            print("Response:", resp.text)
            break

