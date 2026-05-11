from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.booking import Booking
from app.models.booking_history import BookingHistory
from app.models.space_category import SpaceCategory
from app.models.parking import Parking
from app.models.vehicle import Vehicle
from datetime import datetime, timezone, timedelta
from typing import Optional, List

# Definir Timezone de Buenos Aires (GMT-3)
BA_TZ = timezone(timedelta(hours=-3))

class BookingService:
    @staticmethod
    def create_booking(
        db: Session,
        id_profile: int,
        id_vehicle: int,
        id_parking: int,
        id_category: int,
        start_time: datetime,
        end_time: datetime
    ):
        # 1. Validaciones de Seguridad y Lógica
        # Permitimos un margen de 5 minutos al pasado para evitar errores de red/sincronización
        now = datetime.now(BA_TZ)
        if start_time < (now - timedelta(minutes=5)):
            raise ValueError("Start time must be in the future (or now)")
        if end_time <= start_time:
            raise ValueError("End time must be after start time")

        # Verificar si el usuario YA tiene una reserva que se solapa en CUALQUIER lugar
        user_overlap = db.query(Booking).filter(
            Booking.id_profile == id_profile,
            Booking.current_status.in_(["pending", "active"]),
            and_(
                Booking.expected_start_time < end_time,
                Booking.expected_end_time > start_time
            )
        ).first()
        
        if user_overlap:
            raise ValueError("Ya tienes otra reserva activa o pendiente en este horario")

        # Verificar que el vehículo pertenezca al usuario
        vehicle = db.query(Vehicle).filter_by(id_vehicle=id_vehicle, id_profile=id_profile).first()
        if not vehicle:
            raise ValueError("Vehicle not found or doesn't belong to the user")

        try:
            # 2. Control de Concurrencia (Locking)
            # Bloqueamos la fila de la categoría para serializar las reservas en este parking/categoría
            category = db.query(SpaceCategory).with_for_update().filter_by(
                id_category=id_category, 
                id_parking=id_parking,
                is_active=True
            ).first()

            if not category:
                raise ValueError("Space category not found or inactive")

            # 3. Validación de Capacidad (Solapamiento)
            # Buscamos reservas que se solapen: (S1 < E2) AND (E1 > S2)
            overlapping_bookings = db.query(Booking).filter(
                Booking.id_category == id_category,
                Booking.current_status.in_(["pending", "active"]),
                and_(
                    Booking.expected_start_time < end_time,
                    Booking.expected_end_time > start_time
                )
            ).count()

            if overlapping_bookings >= category.max_capacity:
                raise ValueError("No spots available for the selected time range")

            # 4. Obtener tasa aplicada
            parking = db.query(Parking).filter_by(id_parking=id_parking).first()
            if not parking:
                raise ValueError("Parking not found")
                
            applied_rate = parking.base_hourly_rate * category.price_multiplier

            # 5. Crear Reserva
            booking = Booking(
                id_profile=id_profile,
                id_vehicle=id_vehicle,
                id_parking=id_parking,
                id_category=id_category,
                expected_start_time=start_time,
                expected_end_time=end_time,
                applied_rate=applied_rate,
                current_status="pending"
            )
            db.add(booking)
            db.flush()

            # Registrar en historial
            history = BookingHistory(
                id_booking=booking.id_booking,
                status="pending",
                changed_at=datetime.now(BA_TZ)
            )
            db.add(history)

            db.commit()
            db.refresh(booking)
            return booking

        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def get_user_bookings(db: Session, id_profile: int) -> List[Booking]:
        return db.query(Booking).filter_by(id_profile=id_profile).all()

    @staticmethod
    def get_parking_bookings(db: Session, id_parking: int) -> List[Booking]:
        return db.query(Booking).filter_by(id_parking=id_parking).all()

    @staticmethod
    def update_booking_status(db: Session, id_booking: int, status: str, id_profile: Optional[int] = None):
        booking = db.query(Booking).filter_by(id_booking=id_booking).first()
        if not booking:
            return None
        
        if id_profile and booking.id_profile != id_profile:
            raise ValueError("Not authorized to update this booking")

        # Política de Cancelación
        if status == "cancelled":
            now = datetime.now(BA_TZ)
            time_until_start = booking.expected_start_time - now
            
            if time_until_start < timedelta(minutes=30):
                # Si falta menos de 30 min, se cancela pero con penalidad (no hay reembolso)
                booking.current_status = "cancelled_with_penalty"
                msg = "Cancelación fuera de término. Se aplicará el cobro total de la reserva."
            else:
                booking.current_status = "cancelled"
                msg = "Reserva cancelada sin cargo."
        else:
            booking.current_status = status
            msg = f"Reserva actualizada a {status}"
        
        history = BookingHistory(
            id_booking=booking.id_booking,
            status=booking.current_status,
            changed_at=datetime.now(BA_TZ)
        )
        db.add(history)
        db.commit()
        db.refresh(booking)
        return {"booking": booking, "message": msg}
