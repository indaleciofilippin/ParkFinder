from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from app.core.security import get_current_user
from sqlalchemy.orm import Session
from app.core.config import SessionLocal
from app.services.booking_service import BookingService
from app.services.parking_service import ParkingService
from app.controllers.parking_controller import verify_park_role
from app.views.base_view import BaseModel
from datetime import datetime, timedelta, timezone
from pydantic import validator
from typing import List, Optional

# Definir Timezone de Buenos Aires (GMT-3)
BA_TZ = timezone(timedelta(hours=-3))

router = APIRouter(prefix="/bookings", tags=["Bookings"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class BookingCreate(BaseModel):
    id_vehicle: int
    id_parking: int
    id_category: int
    expected_start_time: datetime
    expected_end_time: datetime
    card_token: str
    payment_method_id: str

    @validator("expected_start_time", "expected_end_time")
    def force_buenos_aires_tz(cls, v: datetime):
        # Si no tiene zona horaria, se la asignamos como GMT-3
        # Si la tiene, la convertimos a GMT-3
        if v.tzinfo is None:
            return v.replace(tzinfo=BA_TZ)
        return v.astimezone(BA_TZ)

    @validator("expected_end_time")
    def validate_end_after_start(cls, v, values):
        if "expected_start_time" in values and v <= values["expected_start_time"]:
            raise ValueError("End time must be after start time")
        return v

class BookingResponse(BaseModel):
    id_booking: int
    id_profile: int
    id_vehicle: int
    id_parking: int
    id_category: int
    expected_start_time: datetime
    expected_end_time: datetime
    applied_rate: float
    current_status: str
    license_plate: Optional[str] = None
    parking_name: Optional[str] = None
    invoice_total: Optional[float] = None
    invoice_status: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("/", response_model=BookingResponse)
def create_booking(
    booking: BookingCreate, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    id_profile = current_user.get("id_profile")
    email = current_user.get("sub")
    if id_profile is None:
        raise HTTPException(status_code=401, detail="Profile ID not found in token")
    if not email:
        raise HTTPException(status_code=401, detail="Email not found in token")
        
    try:
        return BookingService.create_booking(
            db,
            id_profile=id_profile,
            id_vehicle=booking.id_vehicle,
            id_parking=booking.id_parking,
            id_category=booking.id_category,
            start_time=booking.expected_start_time,
            end_time=booking.expected_end_time,
            card_token=booking.card_token,
            payment_method_id=booking.payment_method_id,
            email=email
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@router.get("/payment-method/saved")
def get_saved_payment_method(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    id_profile = current_user.get("id_profile")
    if id_profile is None:
        raise HTTPException(status_code=401, detail="Profile ID not found in token")
        
    from app.models.payment_transaction import PaymentTransaction as PTModel
    from app.models.invoice import Invoice as InvModel
    from app.models.booking import Booking as BookModel
    
    last_tx = db.query(PTModel).join(InvModel).filter(
        InvModel.id_booking.in_(
            db.query(BookModel.id_booking).filter(BookModel.id_profile == id_profile)
        ),
        PTModel.gateway_reference != "error",
        PTModel.gateway_reference.like("%|%")
    ).order_by(PTModel.id_transaction.desc()).first()
    
    if last_tx:
        parts = last_tx.gateway_reference.split("|")
        customer_id = parts[0]
        card_id = parts[1]
        payment_method_id = parts[2] if len(parts) > 2 else "visa"
        
        # Get card details from Rebill
        try:
            from app.services.payment_service import PaymentService
            import requests
            ps = PaymentService()
            resp = requests.get(f"{ps.base_url}/customers/{customer_id}", headers=ps.headers)
            last_four = "8881"
            if resp.status_code == 200:
                customer_data = resp.json()
                cards = customer_data.get("cards", [])
                for card in cards:
                    if card.get("id") == card_id:
                        last_four = card.get("last4", card.get("last_four_digits", "8881"))
                        break
        except Exception as e:
            print(f"⚠️ Error fetching card details from Rebill: {e}")
            last_four = "8881" # Fallback
            
        return {
            "has_saved_card": True,
            "payment_method_id": payment_method_id,
            "last_four": last_four
        }
    
    return {"has_saved_card": False}

@router.get("/me", response_model=List[BookingResponse])
def get_my_bookings(
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    id_profile = current_user.get("id_profile")
    if id_profile is None:
        raise HTTPException(status_code=401, detail="Profile ID not found in token")
    
    # Limpiar reservas expiradas antes de mostrar la actividad
    from app.services.space_category_service import SpaceCategoryService
    from app.models.invoice import Invoice as InvoiceModel
    SpaceCategoryService._prune_expired_bookings(db)

    bookings = BookingService.get_user_bookings(db, id_profile=id_profile)

    # Attach invoice data to each booking
    for booking in bookings:
        invoice = db.query(InvoiceModel).filter_by(id_booking=booking.id_booking).order_by(InvoiceModel.id_invoice.desc()).first()
        if invoice and float(invoice.total_amount) > 0:
            booking.invoice_total = float(invoice.total_amount)
            booking.invoice_status = invoice.payment_status
        else:
            booking.invoice_total = None
            booking.invoice_status = None

    return bookings

@router.put("/{id_booking}/status")
def update_status(
    id_booking: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    id_profile = current_user.get("id_profile")
    if id_profile is None:
        raise HTTPException(status_code=401, detail="Profile ID not found in token")
        
    try:
        result = BookingService.update_booking_status(db, id_booking, new_status, id_profile)
        if not result:
            raise HTTPException(status_code=404, detail="Booking not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/parking/{id_parking}", response_model=List[BookingResponse])
def get_parking_bookings(
    id_parking: int,
    db: Session = Depends(get_db),
    id_profile: int = Depends(verify_park_role),
    current_user: dict = Depends(get_current_user)
):
    # Verificar propiedad del parking
    parking = ParkingService.get_parking_by_id(db, id_parking)
    role = current_user.get("role")
    
    if not parking:
        raise HTTPException(status_code=404, detail="Parking not found")
        
    if role != "dev" and parking.id_profile != id_profile:
        raise HTTPException(status_code=404, detail="Parking not found or not owned by user")
        
    return BookingService.get_parking_bookings(db, id_parking)

class BarrierCheckRequest(BaseModel):
    id_parking: int
    license_plate: str

@router.post("/barrier/check")
def check_barrier_plate(request: BarrierCheckRequest, db: Session = Depends(get_db)):
    try:
        print(f"\n=======================================================")
        print(f"📥 [BACKEND API] RECIBIDA CONSULTA DE BARRERA")
        print(f"   🚗 Patente recibida: '{request.license_plate}'")
        print(f"   🏢 Cochera ID: {request.id_parking}")
        print(f"=======================================================\n")
        
        result = BookingService.process_barrier_check(db, request.id_parking, request.license_plate)
        
        print(f"\n=======================================================")
        print(f"📤 [BACKEND API] RESULTADO ENVIADO")
        print(f"   🚦 Status: {result.get('status')}")
        print(f"   🎬 Acción: {result.get('action')}")
        print(f"   💬 Mensaje: {result.get('message')}")
        print(f"=======================================================\n")
        
        return result
    except Exception as e:
        print(f"\n=======================================================")
        print(f"🚨 [BACKEND API] ERROR EXCEPCIONAL EN CONSULTA BARRERA")
        print(f"   💥 Detalle: {str(e)}")
        print(f"=======================================================\n")
        raise HTTPException(status_code=500, detail=f"Internal error processing barrier check: {str(e)}")

@router.get("/barrier/latest-event/{id_parking}")
def get_latest_barrier_event(id_parking: int, db: Session = Depends(get_db)):
    try:
        event = BookingService.get_latest_barrier_event(db, id_parking)
        if not event:
            return {"has_event": False}
        return {"has_event": True, "event": event}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error fetching latest event: {str(e)}")

@router.post("/barrier/reset-state/{id_parking}")
def reset_barrier_state(id_parking: int):
    try:
        return BookingService.reset_barrier_state(id_parking)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error resetting barrier state: {str(e)}")

@router.post("/barrier/scan-plate")
def scan_plate(file: UploadFile = File(...)):
    import os
    import shutil
    import subprocess
    import json
    
    # Directorio temporal de subidas en el workspace
    temp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../temp_uploads"))
    os.makedirs(temp_dir, exist_ok=True)
    
    # Nombre del archivo temporal
    temp_file_path = os.path.join(temp_dir, f"upload_{file.filename}")
    
    try:
        # Guardar el archivo temporalmente
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Determinar el ejecutable de Python del entorno virtual
        python_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), "../../../LicensePlates-ANPR/venv/bin/python"
        ))
        
        # Determinar el script de escaneo
        script_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), "../../../LicensePlates-ANPR/scan_image.py"
        ))
        
        # Si no existe el intérprete local o el script (caso típico de Docker),
        # usamos el microservicio HTTP de ANPR.
        if not os.path.exists(python_path) or not os.path.exists(script_path):
            print("📡 [BACKEND] Entorno local ANPR no detectado. Intentando conectar al microservicio HTTP de ANPR...")
            import requests
            
            # Intentar primero con la red interna de Docker ('anpr'), el host de la Mac, y luego con 'localhost'
            anpr_env_url = os.getenv("ANPR_API_URL")
            urls_to_try = []
            if anpr_env_url:
                urls_to_try.append(f"{anpr_env_url.rstrip('/')}/scan")
            else:
                urls_to_try.extend([
                    "http://localhost:8001/scan",
                    "http://192.168.1.6:8001/scan",
                    "http://anpr:8001/scan"
                ])
                
            import time
            response_json = None
            last_err = None
            
            for url in urls_to_try:
                for attempt in range(1, 2): # Un solo intento para no colgar el simulador web
                    try:
                        print(f"📡 [BACKEND] Enviando imagen a microservicio: {url} (Intento {attempt}/1)")
                        with open(temp_file_path, "rb") as f:
                            response = requests.post(url, files={"file": (file.filename, f, file.content_type)}, timeout=3.5)
                        if response.status_code == 200:
                            response_json = response.json()
                            break
                        else:
                            last_err = f"Status {response.status_code}: {response.text}"
                            print(f"⚠️ [BACKEND] Error de respuesta de {url} (Intento {attempt}): {last_err}")
                    except Exception as ex:
                        last_err = str(ex)
                        print(f"⚠️ [BACKEND] Error de conexión a {url} (Intento {attempt}): {last_err}")
                    
                    if attempt < 1:
                        time.sleep(1.0)
                if response_json:
                    break
                    
            if not response_json:
                raise HTTPException(status_code=500, detail=f"No se pudo conectar al microservicio de ANPR: {last_err}")
                
            print(f"✅ [BACKEND] IA ANPR por HTTP completada exitosamente. Patente: {response_json.get('best_match')}")
            return {
                "success": response_json.get("success", False),
                "plate": response_json.get("best_match"),
                "plates": response_json.get("plates", [])
            }
            
        # Ejecutar el subproceso usando el intérprete de python del venv de la IA (Fallback local en Host)
        print(f"📡 [BACKEND] Procesando imagen subida en host: '{file.filename}' con IA ANPR...")
        result = subprocess.run(
            [python_path, script_path, temp_file_path],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        # Loggear stderr si existe
        if result.stderr:
            print(f"⚠️ [BACKEND] Subprocess stderr: {result.stderr}")
            
        # Parsea la salida JSON del script
        try:
            output_json = json.loads(result.stdout.strip())
        except Exception as json_err:
            print(f"❌ [BACKEND] Error al parsear salida del script ANPR: {result.stdout}")
            raise HTTPException(
                status_code=500,
                detail=f"Error al procesar la salida del script ANPR. Raw output: {result.stdout}"
            )
            
        # Verificar si hubo un error reportado por el script
        if "error" in output_json:
            raise HTTPException(status_code=400, detail=output_json["error"])
            
        print(f"✅ [BACKEND] IA ANPR completada exitosamente. Patente: {output_json.get('best_match')}")
        return {
            "success": output_json.get("success", False),
            "plate": output_json.get("best_match"),
            "plates": output_json.get("plates", [])
        }
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        print(f"🚨 [BACKEND] Excepción inesperada en scan-plate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error during scanning: {str(e)}")
    finally:
        # Limpieza del archivo temporal
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as clean_err:
                print(f"⚠️ [BACKEND] No se pudo eliminar el archivo temporal {temp_file_path}: {clean_err}")
