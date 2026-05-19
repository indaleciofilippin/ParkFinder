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
import time

# Definir Timezone de Buenos Aires (GMT-3)
BA_TZ = timezone(timedelta(hours=-3))

# Global dictionary tracking the physical barrier states: parking_id (int) -> opened_at_timestamp (float)
# Ensures that plates are not processed consecutively until the barrier is physically closed or safety timeout occurs.
barrier_open_states = {}

def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
        
    return previous_row[-1]

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

    @staticmethod
    def process_barrier_check(db: Session, id_parking: int, license_plate: str):
        # 0. Check if the physical barrier is currently open/closing with a 15-second safety timeout
        opened_at = barrier_open_states.get(id_parking, 0.0)
        if opened_at > 0.0 and (time.time() - opened_at) < 15.0:
            print(f"⚠️ [BACKEND API] LECTURA IGNOLEDA: La barrera ID {id_parking} ya está ABIERTA/PROCESANDO. Ignorando hasta señal de cierre o safety timeout (Pasaron {int(time.time() - opened_at)}s de 15s).")
            return {
                "status": "denied",
                "action": "none",
                "message": "La barrera física ya se encuentra abierta. Esperando que termine de cerrarse por completo o safety timeout."
            }

        # 1. Normalize plate
        clean_plate = license_plate.replace("-", "").replace(" ", "").upper()
        
        # 2. Get active vehicle matching this plate
        # First, try a super fast exact match
        from sqlalchemy import func
        vehicle = db.query(Vehicle).filter(
            func.replace(func.replace(Vehicle.license_plate, '-', ''), ' ', '').ilike(clean_plate),
            Vehicle.is_active == True
        ).first()
        
        if not vehicle:
            # Fuzzy match fallback: search ONLY among vehicles that have active/pending reservations at this specific parking space!
            # This completely eliminates the risk of false positives or global database mismatches.
            active_or_pending_bookings = db.query(Booking).filter(
                Booking.id_parking == id_parking,
                Booking.current_status.in_(["pending", "active"])
            ).all()
            
            booked_vehicle_ids = [b.id_vehicle for b in active_or_pending_bookings]
            
            if booked_vehicle_ids:
                booked_vehicles = db.query(Vehicle).filter(
                    Vehicle.id_vehicle.in_(booked_vehicle_ids),
                    Vehicle.is_active == True
                ).all()
                
                best_matches = []
                min_distance = 999
                
                for v in booked_vehicles:
                    cleaned_db_plate = v.license_plate.replace("-", "").replace(" ", "").upper()
                    dist = levenshtein_distance(clean_plate, cleaned_db_plate)
                    if dist < min_distance:
                        min_distance = dist
                        best_matches = [v]
                    elif dist == min_distance:
                        best_matches.append(v)
                
                # We only auto-resolve if there is a unique best match to avoid ambiguous collisions
                if len(best_matches) == 1 and min_distance <= 2:
                    vehicle = best_matches[0]
                    print(f"🔍 [IA FUZZY MATCH SEGURO] Patente detectada '{clean_plate}' corregida a '{vehicle.license_plate}' de reserva activa/pendiente en esta cochera (Distancia: {min_distance})")
                elif len(best_matches) > 1 and min_distance <= 2:
                    print(f"⚠️ [IA SECURITY COLLISION] Conflicto de patentes difusas en la misma cochera: {[v.license_plate for v in best_matches]}. No se puede auto-autorizar por seguridad.")
        
        if not vehicle:
            print(f"❌ [SECURITY DENIED] Intento de acceso de vehículo NO REGISTRADO: '{clean_plate}'")
            return {
                "status": "denied",
                "action": "none",
                "message": f"Acceso denegado. El vehículo con patente {license_plate.upper()} no está registrado en el sistema de ParkFinder."
            }

        # 3. Look for active booking first (for check-out)
        active_booking = db.query(Booking).filter(
            Booking.id_vehicle == vehicle.id_vehicle,
            Booking.id_parking == id_parking,
            Booking.current_status == "active"
        ).first()

        if active_booking:
            # CHECK-OUT!
            active_booking.current_status = "completed"
            
            # Log inside access log (find existing entry log first)
            access_log = db.query(AccessLog).filter_by(id_booking=active_booking.id_booking).order_by(AccessLog.id_access_log.desc()).first()
            now = datetime.now(BA_TZ)
            if access_log:
                access_log.actual_exit_time = now
            else:
                access_log = AccessLog(
                    id_booking=active_booking.id_booking,
                    ai_read_plate=vehicle.license_plate,
                    actual_entry_time=active_booking.expected_start_time,
                    actual_exit_time=now
                )
                db.add(access_log)
                
            # History log
            history = BookingHistory(
                id_booking=active_booking.id_booking,
                status="completed",
                changed_at=now
            )
            db.add(history)
            db.commit()
            
            barrier_open_states[id_parking] = time.time()
            return {
                "status": "allowed",
                "action": "check-out",
                "message": f"Salida autorizada para {vehicle.model} ({vehicle.license_plate}). ¡Gracias por elegirnos!",
                "booking_id": active_booking.id_booking,
                "vehicle_model": vehicle.model
            }

        # 4. If no active booking, look for a pending booking (for check-in)
        pending_booking = db.query(Booking).filter(
            Booking.id_vehicle == vehicle.id_vehicle,
            Booking.id_parking == id_parking,
            Booking.current_status == "pending"
        ).order_by(Booking.expected_start_time.asc()).first()

        if pending_booking:
            # CHECK-IN TIME WINDOW VALIDATION
            now = datetime.now(BA_TZ)
            early_margin = timedelta(minutes=30)
            
            # Normalize expected times to Buenos Aires timezone for bulletproof comparison
            expected_start = pending_booking.expected_start_time.replace(tzinfo=BA_TZ) if pending_booking.expected_start_time.tzinfo is None else pending_booking.expected_start_time.astimezone(BA_TZ)
            expected_end = pending_booking.expected_end_time.replace(tzinfo=BA_TZ) if pending_booking.expected_end_time.tzinfo is None else pending_booking.expected_end_time.astimezone(BA_TZ)
            
            # If the booking starts too far in the future
            if now < expected_start - early_margin:
                start_time_str = expected_start.strftime('%H:%M')
                print(f"❌ [SECURITY DENIED] Ingreso anticipado denegado para '{vehicle.license_plate}'. Reserva inicia a las {start_time_str}")
                return {
                    "status": "denied",
                    "action": "none",
                    "message": f"Acceso denegado. Su reserva inicia a las {start_time_str}. Puede ingresar desde 30 min antes."
                }
            
            # If the booking has already expired (past expected_end_time)
            if now > expected_end:
                end_time_str = expected_end.strftime('%H:%M')
                print(f"❌ [SECURITY DENIED] Ingreso expirado denegado para '{vehicle.license_plate}'. Reserva finalizó a las {end_time_str}")
                return {
                    "status": "denied",
                    "action": "none",
                    "message": f"Acceso denegado. Su reserva en esta cochera expiró a las {end_time_str}."
                }

            # CHECK-IN!
            pending_booking.current_status = "active"
            now = datetime.now(BA_TZ)
            
            # Create access log
            access_log = AccessLog(
                id_booking=pending_booking.id_booking,
                ai_read_plate=vehicle.license_plate,
                actual_entry_time=now,
                actual_exit_time=None
            )
            db.add(access_log)
            
            # History log
            history = BookingHistory(
                id_booking=pending_booking.id_booking,
                status="active",
                changed_at=now
            )
            db.add(history)
            db.commit()

            barrier_open_states[id_parking] = time.time()
            return {
                "status": "allowed",
                "action": "check-in",
                "message": f"Ingreso autorizado para {vehicle.model} ({vehicle.license_plate}). La barrera se ha abierto.",
                "booking_id": pending_booking.id_booking,
                "vehicle_model": vehicle.model
            }

        # 5. Neither active nor pending found -> STRICT ACCESS DENIAL!
        print(f"❌ [SECURITY DENIED] Vehículo '{vehicle.license_plate}' intentó ingresar sin reserva vigente en la cochera ID {id_parking}")
        return {
            "status": "denied",
            "action": "none",
            "message": f"Acceso denegado. No se encontraron reservas activas o pendientes para el vehículo {vehicle.license_plate} en esta cochera."
        }

    @staticmethod
    def get_latest_barrier_event(db: Session, id_parking: int):
        # Get the latest access log globally to bypass any parking ID mismatches during simulation/testing
        latest_log = (
            db.query(AccessLog)
            .join(Booking, AccessLog.id_booking == Booking.id_booking)
            .order_by(AccessLog.id_access_log.desc())
            .first()
        )
        
        if not latest_log:
            return None
            
        # Determine if it was an entry or exit based on actual_exit_time
        action = "check-out" if latest_log.actual_exit_time else "check-in"
        timestamp = latest_log.actual_exit_time if latest_log.actual_exit_time else latest_log.actual_entry_time
        
        return {
            "id_access_log": latest_log.id_access_log,
            "license_plate": latest_log.ai_read_plate,
            "action": action,
            "timestamp": timestamp.isoformat() if timestamp else None
        }

    @staticmethod
    def reset_barrier_state(id_parking: int):
        barrier_open_states[id_parking] = 0.0
        print(f"🟢 [BACKEND API] BARRERA ID {id_parking} CERRADA FISICAMENTE - REENVIANDO LECTURAS HABILITADAS")
        return {"status": "success", "message": f"Barrier state reset to closed for parking {id_parking}."}
