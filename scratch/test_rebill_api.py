import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("REBILL_API_KEY")

if not api_key or "placeholder" in api_key:
    print("❌ Clave de Rebill no configurada correctamente en .env")
    exit(1)

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# 1. Test GET Customers
print("probando GET /v3/customers...")
resp = requests.get("https://api.rebill.com/v3/customers", headers=headers)
print("Status:", resp.status_code)
print("Response:", resp.text)

# 2. Test POST Customer with empty body to see required fields
print("\nprobando POST /v3/customers con body vacio...")
resp2 = requests.post("https://api.rebill.com/v3/customers", headers=headers, json={})
print("Status:", resp2.status_code)
print("Response:", resp2.text)

