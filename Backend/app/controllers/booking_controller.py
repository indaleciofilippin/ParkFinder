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

    class Config:
        from_attributes = True

@router.post("/", response_model=BookingResponse)
def create_booking(
    booking: BookingCreate, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    id_profile = current_user.get("id_profile")
    if id_profile is None:
        raise HTTPException(status_code=401, detail="Profile ID not found in token")
        
    try:
        return BookingService.create_booking(
            db,
            id_profile=id_profile,
            id_vehicle=booking.id_vehicle,
            id_parking=booking.id_parking,
            id_category=booking.id_category,
            start_time=booking.expected_start_time,
            end_time=booking.expected_end_time
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

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
    SpaceCategoryService._prune_expired_bookings(db)
        
    return BookingService.get_user_bookings(db, id_profile=id_profile)

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
    id_profile: int = Depends(verify_park_role)
):
    # Verificar propiedad del parking
    parking = ParkingService.get_parking_by_id(db, id_parking)
    if not parking or parking.id_profile != id_profile:
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
        
        if not os.path.exists(python_path):
            raise HTTPException(status_code=500, detail=f"Venv python interpreter not found at: {python_path}")
            
        if not os.path.exists(script_path):
            raise HTTPException(status_code=500, detail=f"ANPR scan script not found at: {script_path}")
            
        # Ejecutar el subproceso usando el intérprete de python del venv de la IA
        print(f"📡 [BACKEND] Procesando imagen subida: '{file.filename}' con IA ANPR...")
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
