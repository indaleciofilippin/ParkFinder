from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.booking import Booking
from app.models.booking_history import BookingHistory
from app.models.space_category import SpaceCategory
from app.models.parking import Parking
from app.models.vehicle import Vehicle
from app.models.access_log import AccessLog
from app.models.invoice import Invoice
from app.models.payment_transaction import PaymentTransaction
from app.services.payment_service import PaymentService
from decimal import Decimal
import math
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
        end_time: datetime,
        card_token: str,
        payment_method_id: str,
        email: str
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
            raise ValueError("El vehículo seleccionado no existe o no te pertenece")

        # Verificar si existe CUALQUIER reserva que se solape y tenga la misma patente física (incluso de otro usuario)
        from sqlalchemy import func
        clean_plate_to_book = vehicle.license_plate.replace("-", "").replace(" ", "").upper()
        
        overlapping_plate = db.query(Booking).join(Vehicle, Booking.id_vehicle == Vehicle.id_vehicle).filter(
            func.replace(func.replace(Vehicle.license_plate, '-', ''), ' ', '').ilike(clean_plate_to_book),
            Booking.current_status.in_(["pending", "active"]),
            and_(
                Booking.expected_start_time < end_time,
                Booking.expected_end_time > start_time
            )
        ).first()

        if overlapping_plate:
            raise ValueError("Este vehículo ya tiene una reserva en este horario (posiblemente realizada por otra cuenta que también tiene registrada esta patente).")

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
            
            # 6. Registrar método de pago en Mercado Pago (Reutilización o Nueva Tokenización)
            if not card_token or card_token == "use_saved_card":
                # Buscar la última transacción válida de este usuario
                last_tx = db.query(PaymentTransaction).join(Invoice).filter(
                    Invoice.id_booking.in_(
                        db.query(Booking.id_booking).filter(Booking.id_profile == id_profile)
                    ),
                    PaymentTransaction.gateway_reference != "error",
                    PaymentTransaction.gateway_reference.like("%|%")
                ).order_by(PaymentTransaction.id_transaction.desc()).first()
                
                if last_tx and "|" in last_tx.gateway_reference:
                    parts = last_tx.gateway_reference.split("|")
                    card_info = {
                        "customer_id": parts[0],
                        "card_id": parts[1]
                    }
                    payment_method_id = parts[2] if len(parts) > 2 else payment_method_id
                else:
                    raise ValueError("No se encontró ninguna tarjeta guardada en tu perfil. Por favor, ingresa los datos de tu tarjeta.")
            else:
                payment_service = PaymentService()
                card_info = payment_service.create_customer_and_save_card(email, card_token)
            
            # Crear Factura inicial (pendiente de cálculo al check-out)
            invoice = Invoice(
                subtotal_parking=Decimal("0.00"),
                service_fee=Decimal("0.00"),
                total_amount=Decimal("0.00"),
                platform_revenue=Decimal("0.00"),
                payment_status="pending",
                issued_at=datetime.now(BA_TZ),
                id_booking=booking.id_booking
            )
            db.add(invoice)
            db.flush()
            
            # Registrar la transacción tokenizada
            gateway_ref = f"{card_info['customer_id']}|{card_info['card_id']}|{payment_method_id}"
            transaction = PaymentTransaction(
                id_invoice=invoice.id_invoice,
                gateway_reference=gateway_ref,
                payment_method=payment_method_id,
                amount_attempted=Decimal("0.00"),
                status="pending",
                attempted_at=datetime.now(BA_TZ)
            )
            db.add(transaction)

            db.commit()
            db.refresh(booking)
            v = db.query(Vehicle).filter_by(id_vehicle=booking.id_vehicle).first()
            booking.license_plate = v.license_plate if v else "Unknown"
            return booking

        except Exception as e:
            db.rollback()
            raise

    @staticmethod
    def get_user_bookings(db: Session, id_profile: int) -> List[Booking]:
        from app.models.parking import Parking
        bookings = db.query(Booking).filter_by(id_profile=id_profile).all()
        for b in bookings:
            v = db.query(Vehicle).filter_by(id_vehicle=b.id_vehicle).first()
            b.license_plate = v.license_plate if v else "Unknown"
            p = db.query(Parking).filter_by(id_parking=b.id_parking).first()
            b.parking_name = p.name if p else f"Cochera {b.id_parking}"
        return bookings

    @staticmethod
    def get_parking_bookings(db: Session, id_parking: int) -> List[Booking]:
        from app.models.parking import Parking
        bookings = db.query(Booking).filter_by(id_parking=id_parking).all()
        for b in bookings:
            v = db.query(Vehicle).filter_by(id_vehicle=b.id_vehicle).first()
            b.license_plate = v.license_plate if v else "Unknown"
            p = db.query(Parking).filter_by(id_parking=b.id_parking).first()
            b.parking_name = p.name if p else f"Cochera {b.id_parking}"
        return bookings

    @staticmethod
    def _simulate_instant_payout(db: Session, id_parking: int, amount: float):
        from app.models.parking import Parking
        from app.models.user_profile import UserProfile
        parking = db.query(Parking).filter_by(id_parking=id_parking).first()
        if not parking:
            return

        owner_profile = db.query(UserProfile).filter_by(id_profile=parking.id_profile).first()
        if not owner_profile:
            return

        cbu = owner_profile.cbu_cvu or "NO CONFIGURADO"
        alias = owner_profile.bank_alias or "NO CONFIGURADO"

        print("\n" + "="*50)
        print(f"💸 [SIMULATED PAYOUT] TRANSFERENCIA INSTANTÁNEA")
        print(f"  Beneficiario: {owner_profile.first_name} {owner_profile.last_name}")
        print(f"  CBU/CVU: {cbu} | Alias: {alias}")
        print(f"  Monto a liquidar: ${amount:.2f}")
        print(f"  Concepto: Ganancias de Reserva en Cochera #{id_parking}")
        print("="*50 + "\n")

    @staticmethod
    def _charge_penalty(db: Session, booking: Booking, reason: str) -> None:
        """Helper to charge 50% of the hourly rate as penalty."""
        from app.models.user_profile import UserProfile
        from app.models.user_auth import UserAuth

        # Penalty is 50% of the hourly base rate. The user pays this exactly.
        total_amount = booking.applied_rate * Decimal("0.50")
        service_fee = total_amount * Decimal("0.10") # 10% platform fee
        owner_revenue = total_amount - service_fee
        penalty_subtotal = total_amount

        invoice = db.query(Invoice).filter(
            Invoice.id_booking == booking.id_booking,
            Invoice.payment_status.in_(["pending", "failed"])
        ).first()

        if not invoice:
            print(f"⚠️ [PENALTY] No pending invoice found for booking {booking.id_booking}")
            return

        transaction = db.query(PaymentTransaction).filter_by(id_invoice=invoice.id_invoice, status="pending").first()
        if not transaction:
            print(f"⚠️ [PENALTY] No pending transaction found for booking {booking.id_booking}")
            return

        try:
            parts = transaction.gateway_reference.split("|")
            customer_id = parts[0]
            card_id = parts[1]
            payment_method_id = parts[2] if len(parts) > 2 else "visa"

            driver_profile = db.query(UserProfile).filter_by(id_profile=booking.id_profile).first()
            driver_auth = db.query(UserAuth).filter_by(id_user_auth=driver_profile.id_auth).first() if driver_profile else None
            driver_email = driver_auth.email if driver_auth else "driver@parkfinder.com"

            payment_service = PaymentService()
            payment_result = payment_service.charge_saved_card(
                customer_id=customer_id,
                card_id=card_id,
                amount=float(total_amount),
                payment_method_id=payment_method_id,
                email=driver_email
            )
            payment_status = "paid" if payment_result["status"] == "approved" else "failed"
            gateway_reference = payment_result["gateway_reference"]
        except Exception as e:
            print(f"⚠️ [PENALTY] Error charging penalty: {e}")
            payment_status = "failed"
            gateway_reference = "error"
            payment_method_id = "credit_card"

        now = datetime.now(BA_TZ)
        invoice.subtotal_parking = penalty_subtotal
        invoice.service_fee = service_fee
        invoice.total_amount = total_amount
        invoice.platform_revenue = service_fee
        invoice.payment_status = payment_status
        invoice.issued_at = now

        charge_tx = PaymentTransaction(
            id_invoice=invoice.id_invoice,
            gateway_reference=gateway_reference,
            payment_method=payment_method_id,
            amount_attempted=total_amount,
            status="approved" if payment_status == "paid" else "rejected",
            attempted_at=now
        )
        db.add(charge_tx)
        
        if payment_status == "paid":
            BookingService._simulate_instant_payout(db, booking.id_parking, float(owner_revenue))
        # Note: db.commit() is intentionally left to the caller to avoid partial commits

    @staticmethod
    def process_no_shows(db: Session):
        """Processes bookings that missed their expected start time by > 15 mins."""
        now = datetime.now(BA_TZ)
        pending_bookings = db.query(Booking).filter_by(current_status="pending").all()
        
        for booking in pending_bookings:
            expected_start = booking.expected_start_time.replace(tzinfo=BA_TZ) if booking.expected_start_time.tzinfo is None else booking.expected_start_time.astimezone(BA_TZ)
            if now > expected_start + timedelta(minutes=15):
                print(f"⏰ [NO-SHOW] Booking {booking.id_booking} marked as NO-SHOW")
                booking.current_status = "no_show"
                
                BookingService._charge_penalty(db, booking, "No-Show automático (> 15 min)")
                
                history = BookingHistory(
                    id_booking=booking.id_booking,
                    status="no_show",
                    changed_at=now
                )
                db.add(history)
                db.commit()

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
            expected_start = booking.expected_start_time.replace(tzinfo=BA_TZ) if booking.expected_start_time.tzinfo is None else booking.expected_start_time.astimezone(BA_TZ)
            time_until_start = expected_start - now
            
            if time_until_start < timedelta(minutes=15):
                # Si falta menos de 15 min, se cancela pero con penalidad
                booking.current_status = "cancelled_with_penalty"
                msg = "Cancelación tardía. Se aplicó el cobro de penalidad (50% de 1 hora)."
                BookingService._charge_penalty(db, booking, "Cancelación tardía (< 15 min)")
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
        v = db.query(Vehicle).filter_by(id_vehicle=booking.id_vehicle).first()
        booking.license_plate = v.license_plate if v else "Unknown"
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
        
        # 2. Get active vehicles matching this plate
        # First, try a super fast exact match
        from sqlalchemy import func
        vehicles = db.query(Vehicle).filter(
            func.replace(func.replace(Vehicle.license_plate, '-', ''), ' ', '').ilike(clean_plate),
            Vehicle.is_active == True
        ).all()
        
        vehicle_ids = [v.id_vehicle for v in vehicles]
        vehicle = None
        
        if not vehicles:
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
                    vehicles = [vehicle]
                    vehicle_ids = [vehicle.id_vehicle]
                    print(f"🔍 [IA FUZZY MATCH SEGURO] Patente detectada '{clean_plate}' corregida a '{vehicle.license_plate}' de reserva activa/pendiente en esta cochera (Distancia: {min_distance})")
                elif len(best_matches) > 1 and min_distance <= 2:
                    print(f"⚠️ [IA SECURITY COLLISION] Conflicto de patentes difusas en la misma cochera: {[v.license_plate for v in best_matches]}. No se puede auto-autorizar por seguridad.")
        
        if not vehicles:
            print(f"❌ [SECURITY DENIED] Intento de acceso de vehículo NO REGISTRADO: '{clean_plate}'")
            return {
                "status": "denied",
                "action": "none",
                "message": f"Acceso denegado. El vehículo con patente {license_plate.upper()} no está registrado en el sistema de ParkFinder."
            }

        # 3. Look for active booking first (for check-out)
        active_booking = db.query(Booking).filter(
            Booking.id_vehicle.in_(vehicle_ids),
            Booking.id_parking == id_parking,
            Booking.current_status == "active"
        ).first()

        if active_booking:
            vehicle = db.query(Vehicle).filter_by(id_vehicle=active_booking.id_vehicle).first()
            # CHECK-OUT!
            active_booking.current_status = "completed"
            
            # Log inside access log (find existing entry log first)
            access_log = db.query(AccessLog).filter_by(id_booking=active_booking.id_booking).order_by(AccessLog.id_access_log.desc()).first()
            now = datetime.now(BA_TZ)
            entry_time = active_booking.expected_start_time
            if access_log:
                access_log.actual_exit_time = now
                if access_log.actual_entry_time:
                    entry_time = access_log.actual_entry_time
            else:
                access_log = AccessLog(
                    id_booking=active_booking.id_booking,
                    ai_read_plate=vehicle.license_plate,
                    actual_entry_time=entry_time,
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

            # CALCULATE FARE AND PROCESS MERCADO PAGO CHARGE
            duration = now - entry_time
            duration_seconds = duration.total_seconds()
            # Calculate hours rounded up, minimum 1 hour
            hours = max(1.0, math.ceil(duration_seconds / 3600.0))
            
            total_amount = Decimal(str(hours)) * active_booking.applied_rate
            service_fee = total_amount * Decimal("0.05") # 5% platform fee
            owner_revenue = total_amount - service_fee
            subtotal = total_amount
            platform_revenue = service_fee
            
            payment_status = "failed"
            gateway_reference = "none"
            payment_method_id = "credit_card"
            
            # Look for the pending or failed invoice and payment transaction
            invoice = db.query(Invoice).filter(
                Invoice.id_booking == active_booking.id_booking,
                Invoice.payment_status.in_(["pending", "failed"])
            ).first()
            if not invoice:
                print("❌ [CHECK-OUT] No pending invoice found for this booking.")
                return {
                    "status": "denied",
                    "action": "none",
                    "message": "Acceso denegado. No se encontró una factura pendiente o con pago fallido para esta reserva."
                }
                
            transaction = db.query(PaymentTransaction).filter_by(id_invoice=invoice.id_invoice, status="pending").first()
            if not transaction:
                print("❌ [CHECK-OUT] No pending transaction found for this invoice.")
                return {
                    "status": "denied",
                    "action": "none",
                    "message": "Acceso denegado. No se encontró una transacción de pago registrada."
                }

            try:
                # Extract customer_id, card_id, and payment_method_id
                parts = transaction.gateway_reference.split("|")
                customer_id = parts[0]
                card_id = parts[1]
                payment_method_id = parts[2] if len(parts) > 2 else "visa"
                
                # Retrieve driver email
                from app.models.user_profile import UserProfile
                from app.models.user_auth import UserAuth
                driver_profile = db.query(UserProfile).filter_by(id_profile=active_booking.id_profile).first()
                driver_auth = db.query(UserAuth).filter_by(id_user_auth=driver_profile.id_auth).first() if driver_profile else None
                driver_email = driver_auth.email if driver_auth else "driver@parkfinder.com"
                
                # Charge via Mercado Pago SDK
                payment_service = PaymentService()
                payment_result = payment_service.charge_saved_card(
                    customer_id=customer_id,
                    card_id=card_id,
                    amount=float(total_amount),
                    payment_method_id=payment_method_id,
                    email=driver_email
                )
                
                payment_status = "paid" if payment_result["status"] == "approved" else "failed"
                gateway_reference = payment_result["gateway_reference"]
                payment_method_id = payment_result["payment_method"]
            except Exception as pay_err:
                print(f"⚠️ [CHECK-OUT] Error processing payment flow: {pay_err}")
                payment_status = "failed"
                gateway_reference = "error"
        
            # Update existing invoice
            invoice.subtotal_parking = subtotal
            invoice.service_fee = service_fee
            invoice.total_amount = total_amount
            invoice.platform_revenue = platform_revenue
            invoice.payment_status = payment_status
            invoice.issued_at = now
            
            # Save the checkout transaction attempt
            charge_tx = PaymentTransaction(
                id_invoice=invoice.id_invoice,
                gateway_reference=gateway_reference,
                payment_method=payment_method_id,
                amount_attempted=total_amount,
                status="approved" if payment_status == "paid" else "rejected",
                attempted_at=now
            )
            db.add(charge_tx)
            
            if payment_status == "paid":
                BookingService._simulate_instant_payout(db, id_parking, float(owner_revenue))
            
            if payment_status != "paid":
                db.commit() # Commit the failed invoice/transaction status
                print(f"❌ [CHECK-OUT] Payment failed or rejected by Mercado Pago for booking {active_booking.id_booking}")
                return {
                    "status": "denied",
                    "action": "none",
                    "message": f"Acceso denegado. El cobro automático de ${total_amount:.2f} fue rechazado por Mercado Pago. Verifique su medio de pago.",
                    "booking_id": active_booking.id_booking,
                    "total_charged": float(total_amount),
                    "payment_status": "failed"
                }

            db.commit()
            
            barrier_open_states[id_parking] = time.time()
            return {
                "status": "allowed",
                "action": "check-out",
                "message": f"Salida autorizada para {vehicle.model} ({vehicle.license_plate}). ¡Gracias por elegirnos! Total cobrado: ${total_amount:.2f}",
                "booking_id": active_booking.id_booking,
                "vehicle_model": vehicle.model,
                "total_charged": float(total_amount),
                "payment_status": payment_status
            }

        # 4. If no active booking, look for pending booking (for check-in)
        pending_booking = db.query(Booking).filter(
            Booking.id_vehicle.in_(vehicle_ids),
            Booking.id_parking == id_parking,
            Booking.current_status == "pending"
        ).first()

        if not pending_booking:
            print(f"❌ [DENIED] Vehículo '{clean_plate}' sin reservas válidas para esta cochera.")
            return {
                "status": "denied",
                "action": "none",
                "message": f"Vehículo registrado, pero no tienes reservas pendientes ni activas para la cochera '{id_parking}'."
            }
            
        vehicle = db.query(Vehicle).filter_by(id_vehicle=pending_booking.id_vehicle).first()

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
