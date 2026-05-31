"""
Quick diagnostic to verify Mercado Pago credentials match.
Tests: 1) Access Token validity, 2) Card token generation with Public Key, 3) Card association
"""
import requests
import json

# ===== YOUR CREDENTIALS =====
ACCESS_TOKEN = "TEST-446660840346786-052311-2aeae23ca1cf0ce3181f52da66852de7-292175901"
PUBLIC_KEY = "TEST-892c4deb-2cfe-4b51-9585-0cdd04792cbf"

print("=" * 60)
print("🔍 DIAGNÓSTICO DE CREDENCIALES MERCADO PAGO")
print("=" * 60)

# 1. Test Access Token - Get the user/application info
print("\n📡 [1/3] Verificando Access Token...")
r = requests.get(
    "https://api.mercadopago.com/users/me",
    headers={"Authorization": f"Bearer {ACCESS_TOKEN}"}
)
if r.status_code == 200:
    user = r.json()
    print(f"  ✅ Access Token válido")
    print(f"  👤 User ID: {user.get('id')}")
    print(f"  📧 Email: {user.get('email')}")
    print(f"  🏷️ Nickname: {user.get('nickname')}")
else:
    print(f"  ❌ Access Token inválido: {r.status_code} - {r.text}")
    exit(1)

# 2. Generate a test card token with the Public Key
print("\n📡 [2/3] Generando token de tarjeta de prueba con Public Key...")
token_payload = {
    "card_number": "4509953566233704",
    "expiration_month": 11,
    "expiration_year": 2030,
    "security_code": "123",
    "cardholder": {
        "name": "APRO",
        "identification": {
            "type": "DNI",
            "number": "12345678"
        }
    }
}
r2 = requests.post(
    f"https://api.mercadopago.com/v1/card_tokens?public_key={PUBLIC_KEY}",
    json=token_payload
)
if r2.status_code in [200, 201]:
    token_data = r2.json()
    card_token = token_data["id"]
    print(f"  ✅ Token generado: {card_token[:20]}...")
    print(f"  💳 Last 4: {token_data.get('last_four_digits')}")
    print(f"  🏦 Payment Method: {token_data.get('payment_method', {})}")
else:
    print(f"  ❌ Error generando token: {r2.status_code}")
    print(f"  📄 Response: {r2.text}")
    exit(1)

# 3. Try to create customer and associate card
print("\n📡 [3/3] Intentando crear Customer y asociar tarjeta...")

# Create or find customer
test_email = "test_parkfinder_diag@test.com"
r3 = requests.post(
    "https://api.mercadopago.com/v1/customers/search",
    params={"email": test_email},
    headers={"Authorization": f"Bearer {ACCESS_TOKEN}"}
)

# Try to get existing customer or create new
search_r = requests.get(
    f"https://api.mercadopago.com/v1/customers/search?email={test_email}",
    headers={"Authorization": f"Bearer {ACCESS_TOKEN}"}
)
results = search_r.json().get("results", [])

if results:
    customer_id = results[0]["id"]
    print(f"  📋 Customer existente: {customer_id}")
else:
    create_r = requests.post(
        "https://api.mercadopago.com/v1/customers",
        json={"email": test_email},
        headers={"Authorization": f"Bearer {ACCESS_TOKEN}"}
    )
    if create_r.status_code in [200, 201]:
        customer_id = create_r.json()["id"]
        print(f"  ✅ Customer creado: {customer_id}")
    else:
        print(f"  ❌ Error creando customer: {create_r.status_code} - {create_r.text}")
        exit(1)

# Now try to save card
print(f"\n  📡 Asociando token al customer {customer_id}...")
r4 = requests.post(
    f"https://api.mercadopago.com/v1/customers/{customer_id}/cards",
    json={"token": card_token},
    headers={"Authorization": f"Bearer {ACCESS_TOKEN}"}
)

print(f"  📊 Status: {r4.status_code}")
print(f"  📄 Response: {json.dumps(r4.json(), indent=2)}")

if r4.status_code in [200, 201]:
    card = r4.json()
    print(f"\n  ✅✅✅ ÉXITO! Tarjeta asociada correctamente!")
    print(f"  💳 Card ID: {card.get('id')}")
    print(f"  🏦 Payment Method: {card.get('payment_method', {}).get('id')}")
    print(f"\n🎉 Las credenciales son COMPATIBLES. El flujo funciona.")
else:
    print(f"\n  ❌❌❌ FALLO al asociar tarjeta.")
    print(f"  ⚠️ Esto confirma que la Public Key y el Access Token NO pertenecen a la misma aplicación de Mercado Pago.")
    print(f"\n  🔧 SOLUCIÓN:")
    print(f"     1. Ve a https://www.mercadopago.com.ar/developers/panel/app")
    print(f"     2. Selecciona tu aplicación")
    print(f"     3. Copia AMBAS credenciales de TEST (Public Key + Access Token) de la MISMA app")
    print(f"     4. Actualiza:")
    print(f"        - Frontend/.env -> EXPO_PUBLIC_MP_PUBLIC_KEY=<tu_public_key>")
    print(f"        - .env -> MP_ACCESS_TOKEN=<tu_access_token>")
