import requests
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL").split("?")[0] + "?sslmode=require"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SET search_path TO parkfinder;")
    
    # Get an active booking (status = 'active')
    cur.execute("""
        SELECT b.id_booking, b.id_parking, v.license_plate 
        FROM booking b
        JOIN vehicle v ON b.id_vehicle = v.id_vehicle
        WHERE b.current_status = 'active'
        LIMIT 1;
    """)
    active_booking = cur.fetchone()
    
    if not active_booking:
        print("❌ No hay reservas en estado 'active' (ningún auto está actualmente en el estacionamiento).")
    else:
        id_booking, id_parking, license_plate = active_booking
        print(f"🚗 Encontrada reserva activa ID: {id_booking} | Patente: {license_plate} | Cochera: {id_parking}")
        print("📡 Simulando escaneo de barrera para SALIDA (Checkout)...")
        
        # Trigger barrier check API (this triggers checkout logic if booking is active)
        r = requests.post(
            "http://localhost:8000/api/v1/bookings/barrier/check",
            json={"id_parking": id_parking, "license_plate": license_plate}
        )
        print(f"📊 API Response Status: {r.status_code}")
        print(f"📄 API Response: {r.json()}")

    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
