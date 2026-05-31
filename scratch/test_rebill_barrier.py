import requests
import time

API_URL = "http://127.0.0.1:48084"

def test_barrier_checkout(id_booking):
    print(f"\n🚘 Simulando llegada de auto a la barrera de salida (Check-out) para Reserva {id_booking}...")
    
    payload = {
        "id_booking": id_booking,
        "is_entry": False
    }
    
    try:
        response = requests.post(f"{API_URL}/api/v1/bookings/barrier/check", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ ¡Éxito! Respuesta de la barrera:")
            print(f"   Acción: {data.get('action')}")
            print(f"   Mensaje: {data.get('message')}")
        else:
            print(f"❌ Error {response.status_code}:")
            print(response.json())
            
    except Exception as e:
        print(f"Error de conexión: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        booking_id = int(sys.argv[1])
        test_barrier_checkout(booking_id)
    else:
        print("⚠️ Por favor provee el ID de la reserva. Ejemplo: python scratch/test_rebill_barrier.py 40")
