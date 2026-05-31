import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'Backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import get_db
from app.models.models import Booking, Vehicle, Parking, Category
from app.services.booking_service import BookingService
from datetime import datetime, timedelta
from pytz import timezone

BA_TZ = timezone('America/Argentina/Buenos_Aires')

# Get a session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=create_engine(os.getenv("DATABASE_URL")))
db = SessionLocal()

print("1. Creando Reserva de Prueba...")
try:
    # Use user 1, vehicle 1, parking 1
    booking = BookingService.create_booking(
        db=db,
        id_profile=1,
        id_vehicle=1,
        id_parking=1,
        id_category=1,
        expected_start_time=datetime.now(BA_TZ),
        expected_end_time=datetime.now(BA_TZ) + timedelta(hours=2),
        card_token="test_crd_dummy123",
        payment_method_id="visa"
    )
    print(f"Reserva {booking.id_booking} creada exitosamente con token 'test_crd_dummy123'")

    print("\n2. Simulando Check-In (Entrada)...")
    res_in = BookingService.process_barrier_check(db, booking.id_booking, is_entry=True)
    print("Acción de barrera:", res_in["action"])

    print("\n3. Simulando Check-Out (Salida y Cobro Rebill)...")
    try:
        res_out = BookingService.process_barrier_check(db, booking.id_booking, is_entry=False)
        print("Resultado Check-Out:")
        print(res_out)
    except Exception as e:
        print(f"Check-Out falló (esperado si el token dummy de Rebill es rechazado por Rebill): {e}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
