from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.booking import Booking
from app.models.booking_history import BookingHistory
from app.models.space_category import SpaceCategory
from app.models.parking import Parking
from app.models.vehicle import Vehicle
from app.models.access_log import AccessLog
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from decimal import Decimal

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
        if start_time < datetime.now(BA_TZ):
            raise ValueError("Start time must be in the future")
        if end_time <= start_time:
            raise ValueError("End time must be after start time")

        # Verificar que el vehículo pertenezca al usuario
        vehicle = db.query(Vehicle).filter_by(id_vehicle=id_vehicle, id_profile=id_profile).first()
        if not vehicle:
            raise ValueError("Vehicle not found or doesn't belong to the user")

        # Restricción: Una sola reserva pendiente/activa por vehículo por parking por día
        start_of_day = datetime.combine(start_time.date(), datetime.min.time(), tzinfo=start_time.tzinfo)
        end_of_day = start_of_day + timedelta(days=1)
        
        existing_reservation = db.query(Booking).filter(
            Booking.id_vehicle == id_vehicle,
            Booking.id_parking == id_parking,
            Booking.current_status.in_(["pending", "active"]),
            Booking.expected_start_time >= start_of_day,
            Booking.expected_start_time < end_of_day
        ).first()

        if existing_reservation:
            raise ValueError("You already have a pending or active reservation for this vehicle in this parking lot today. Please complete or cancel it first.")

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
                
            # Calcular duración estimada en horas
            duration = end_time - start_time
            hours = duration.total_seconds() / 3600.0
            
            applied_rate = parking.base_hourly_rate * Decimal(str(hours)) * Decimal(str(category.price_multiplier))

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

        booking.current_status = status
        
        history = BookingHistory(
            id_booking=booking.id_booking,
            status=status,
            changed_at=datetime.now(BA_TZ)
        )
        db.add(history)
        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def _normalize_plate(plate: str) -> str:
        if not plate: return ""
        return "".join(c.upper() for c in plate if c.isalnum())

    @staticmethod
    def process_scanned_plate(db: Session, id_parking: int, license_plate: str):
        norm_scanned = BookingService._normalize_plate(license_plate)
        
        # 1. Intentar búsqueda exacta primero
        # Note: We can't easily use regex in SQLite/SQLAlchemy portably, so we fetch and filter if needed, 
        # but for exact match we can try a direct match first assuming DB is normalized
        vehicles = db.query(Vehicle).filter(Vehicle.is_active == True).all()
        
        vehicle = None
        for v in vehicles:
            if BookingService._normalize_plate(v.license_plate) == norm_scanned:
                vehicle = v
                break

        booking = None
        if vehicle:
            # Obtener todas las reservas pendientes/activas ordenadas por tiempo
            bookings = db.query(Booking).filter(
                Booking.id_vehicle == vehicle.id_vehicle,
                Booking.id_parking == id_parking,
                Booking.current_status.in_(["pending", "active"])
            ).order_by(Booking.expected_start_time.asc()).all()

            # Buscar la primera válida (activa con access_log, o pendiente)
            for b in bookings:
                if b.current_status == "active":
                    al = db.query(AccessLog).filter_by(id_booking=b.id_booking).first()
                    if al:
                        booking = b
                        break
                elif b.current_status == "pending":
                    booking = b
                    break

        if not booking:
            return {"access_granted": False, "detail": "No pending/active booking found for this plate"}

        now = datetime.now(BA_TZ)

        if booking.current_status == "pending":
            # LOGICA DE ENTRADA
            booking.current_status = "active"
            
            # Crear AccessLog
            access_log = AccessLog(
                id_booking=booking.id_booking,
                ai_read_plate=license_plate,
                actual_entry_time=now,
                actual_exit_time=None
            )
            db.add(access_log)

            history = BookingHistory(
                id_booking=booking.id_booking,
                status="active",
                changed_at=now
            )
            db.add(history)
            db.commit()
            db.refresh(booking)

            return {
                "access_granted": True, 
                "detail": f"ENTRY: Access granted for plate {vehicle.license_plate} (Read as: {license_plate})",
                "booking_id": booking.id_booking,
                "vehicle_model": vehicle.model
            }
            
        elif booking.current_status == "active":
            # LOGICA DE SALIDA
            access_log = db.query(AccessLog).filter_by(id_booking=booking.id_booking).first()
            if not access_log:
                return {"access_granted": False, "detail": "Active booking but no access log found"}
            
            # Check 1 minute cooldown (grace period)
            time_diff = now - access_log.actual_entry_time
            if time_diff.total_seconds() < 60:
                return {"access_granted": False, "detail": "Ignored: Still within 1 min grace period since entry"}

            # Registrar salida
            access_log.actual_exit_time = now
            booking.current_status = "completed"

            # Calcular precio final basado en el tiempo real
            duration = now - access_log.actual_entry_time
            hours = duration.total_seconds() / 3600.0
            
            # Obtener parking y categoría para recalcular
            parking = db.query(Parking).filter_by(id_parking=booking.id_parking).first()
            category = db.query(SpaceCategory).filter_by(id_category=booking.id_category).first()
            
            if parking and category:
                # Se asume que applied_rate guarda el total acumulado
                booking.applied_rate = parking.base_hourly_rate * Decimal(str(hours)) * Decimal(str(category.price_multiplier))

            history = BookingHistory(
                id_booking=booking.id_booking,
                status="completed",
                changed_at=now
            )
            db.add(history)
            db.commit()
            db.refresh(booking)

            return {
                "access_granted": True, 
                "detail": f"EXIT: Vehicle departed. Booking completed.",
                "booking_id": booking.id_booking,
                "vehicle_model": vehicle.model
            }

