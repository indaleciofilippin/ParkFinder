import requests
import time
from datetime import datetime, timedelta

API_URL = "http://127.0.0.1:8000"

print("1. Creando una reserva con un card_token de prueba...")
booking_payload = {
    "id_vehicle": 1, 
    "id_parking": 1,
    "id_category": 1,
    "expected_start_time": datetime.utcnow().isoformat() + "Z",
    "expected_end_time": (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z",
    "card_token": "test_crd_12345",
    "payment_method_id": "visa"
}
# Assuming user id 1 is authenticated. We need to bypass auth or use a test user token.
# Let's get a token for test user.
token_resp = requests.post(f"{API_URL}/api/v1/auth/login", data={"username":"indalecio@example.com", "password":"password123"})
if token_resp.status_code == 200:
    access_token = token_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
else:
    # Try another user or fail
    print("Could not login:", token_resp.text)
    exit(1)

resp = requests.post(f"{API_URL}/api/v1/bookings/", json=booking_payload, headers=headers)
if resp.status_code != 200:
    print("Error creating booking:", resp.text)
    exit(1)

booking = resp.json()
booking_id = booking["id_booking"]
print(f"Reserva {booking_id} creada exitosamente.")

print(f"\n2. Simulando llegada a la barrera de ENTRADA para reserva {booking_id}...")
checkin_payload = {"id_booking": booking_id, "is_entry": True}
resp = requests.post(f"{API_URL}/api/v1/bookings/barrier/check", json=checkin_payload)
print("Check-in status:", resp.status_code, resp.json())

# Esperamos un momento
time.sleep(1)

print(f"\n3. Simulando llegada a la barrera de SALIDA para reserva {booking_id}...")
checkout_payload = {"id_booking": booking_id, "is_entry": False}
resp = requests.post(f"{API_URL}/api/v1/bookings/barrier/check", json=checkout_payload)
print("Check-out status:", resp.status_code)
print("Respuesta:", resp.json())

