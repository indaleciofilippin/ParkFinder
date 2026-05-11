from fastapi import APIRouter, Depends, HTTPException, status
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
