from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.core.security import get_current_user
from sqlalchemy.orm import Session
from app.core.config import SessionLocal
from app.services.parking_service import ParkingService
from app.services.space_category_service import SpaceCategoryService
from app.models.parking import Parking
from app.views.base_view import BaseModel
from typing import List, Optional
from decimal import Decimal

router = APIRouter(prefix="/parkings", tags=["Parkings"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ParkingCreate(BaseModel):
    name: str
    base_hourly_rate: float
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ParkingUpdate(BaseModel):
    name: Optional[str] = None
    base_hourly_rate: Optional[float] = None
    is_active: Optional[bool] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class CategorySummary(BaseModel):
    id_category: int
    name: str
    max_capacity: int
    occupied: int
    available: int
    price_multiplier: float

class ParkingResponse(BaseModel):
    id_parking: int
    name: str
    base_hourly_rate: float
    is_active: bool
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_capacity: int = 0
    total_occupied: int = 0
    total_available: int = 0
    categories: List[CategorySummary] = []

    class Config:
        from_attributes = True

class CategoryMonitoring(BaseModel):
    id_category: int
    name: str
    max_capacity: int
    active_occupancy: int
    pending_reservations: int
    available_spaces: int

class MonitoringResponse(BaseModel):
    id_parking: int
    timestamp: str
    total_capacity: int
    total_active: int
    total_pending: int
    total_available: int
    categories: List[CategoryMonitoring]

def get_current_profile(current_user: dict = Depends(get_current_user)):
    id_profile = current_user.get("id_profile")
    if id_profile is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Profile ID not found in token")
    return id_profile

def verify_park_role(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    id_profile = current_user.get("id_profile")
    if role not in ["park", "dev", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions to manage parkings")
    if id_profile is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Profile ID not found in token")
    return id_profile

@router.post("/", response_model=ParkingResponse)
def create_parking(
    parking: ParkingCreate, 
    db: Session = Depends(get_db), 
    id_profile: int = Depends(verify_park_role)
):
    try:
        return ParkingService.create_parking(
            db,
            id_profile=id_profile, 
            name=parking.name, 
            base_hourly_rate=parking.base_hourly_rate,
            address=parking.address,
            latitude=parking.latitude,
            longitude=parking.longitude
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

from fastapi.responses import JSONResponse

@router.get("/")
def get_parkings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    id_profile = current_user.get("id_profile")
    
    if role in ["park"]:
        parkings = ParkingService.get_user_parkings(db, id_profile)
    else:
        parkings = db.query(Parking).filter(Parking.is_active == True).all()
        
    results = []
    for p in parkings:
        availability = SpaceCategoryService.get_parking_availability(db, p.id_parking)
        # UNIFICACIÓN TOTAL DE CAMPOS
        parking_data = {
            "id_parking": int(p.id_parking),
            "name": str(p.name or "Cochera"),
            "parking_name": str(p.name or "Cochera"),
            "base_hourly_rate": float(p.base_hourly_rate or 0),
            "base_rate": float(p.base_hourly_rate or 0),
            "address": p.address,
            "latitude": float(p.latitude) if p.latitude is not None else None,
            "longitude": float(p.longitude) if p.longitude is not None else None,
            "total_capacity": int(availability.get("total_capacity", 0)),
            "total_occupied": int(availability.get("total_occupied", 0)),
            "total_available": int(availability.get("total_available", 0)),
            "categories": availability.get("categories", [])
        }
        results.append(parking_data)
    
    return JSONResponse(content=results)

@router.get("/user/{id_profile}", response_model=List[ParkingResponse])
def get_parkings_by_user(
    id_profile: int, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    # Endpoint específico para ver las cocheras de un perfil puntual (público o admin)
    parkings = ParkingService.get_user_parkings(db, id_profile=id_profile)
    results = []
    for p in parkings:
        availability = SpaceCategoryService.get_parking_availability(db, p.id_parking)
        availability["name"] = p.name
        availability["base_hourly_rate"] = float(p.base_hourly_rate)
        availability["address"] = p.address
        availability["latitude"] = float(p.latitude) if p.latitude is not None else None
        availability["longitude"] = float(p.longitude) if p.longitude is not None else None
        results.append(availability)
    return results

@router.put("/{id_parking}", response_model=ParkingResponse)
def update_parking(
    id_parking: int, 
    parking: ParkingUpdate, 
    db: Session = Depends(get_db), 
    id_profile: int = Depends(verify_park_role)
):
    try:
        updated = ParkingService.update_parking(
            db, 
            id_parking=id_parking, 
            id_profile=id_profile, 
            name=parking.name, 
            base_hourly_rate=parking.base_hourly_rate,
            is_active=parking.is_active,
            address=parking.address,
            latitude=parking.latitude,
            longitude=parking.longitude
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Parking not found or not owned by user")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{id_parking}")
def delete_parking(
    id_parking: int, 
    db: Session = Depends(get_db), 
    id_profile: int = Depends(verify_park_role),
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    deleted = ParkingService.delete_parking(db, id_parking=id_parking, id_profile=id_profile, role=role)
    if not deleted:
        raise HTTPException(status_code=404, detail="Parking not found or not owned by user")
    return {"msg": "Parking deleted successfully"}

@router.get("/{id_parking}/availability")
def get_parking_availability(
    id_parking: int,
    db: Session = Depends(get_db)
):
    availability = SpaceCategoryService.get_parking_availability(db, id_parking)
    parking = ParkingService.get_parking_by_id(db, id_parking)
    if not availability["categories"] and not parking:
        raise HTTPException(status_code=404, detail="Parking not found")
    
    if parking:
        availability["parking_name"] = parking.name
        availability["base_rate"] = float(parking.base_hourly_rate)
        
    return availability

@router.get("/availability/all")
def get_all_parkings_availability(
    db: Session = Depends(get_db)
):
    parkings = db.query(Parking).filter(Parking.is_active == True).all()
    results = []
    for p in parkings:
        availability = SpaceCategoryService.get_parking_availability(db, p.id_parking)
        availability["name"] = p.name
        availability["parking_name"] = p.name
        availability["base_hourly_rate"] = float(p.base_hourly_rate)
        availability["base_rate"] = float(p.base_hourly_rate)
        availability["address"] = p.address
        availability["latitude"] = float(p.latitude) if p.latitude is not None else None
        availability["longitude"] = float(p.longitude) if p.longitude is not None else None
        results.append(availability)
    return results

@router.get("/{id_parking}/monitoring", response_model=MonitoringResponse)
def get_parking_monitoring(
    id_parking: int,
    db: Session = Depends(get_db),
    id_profile: int = Depends(verify_park_role),
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    
    # Verify ownership
    if role == "dev":
        db_parking = db.query(Parking).filter(Parking.id_parking == id_parking).first()
    else:
        db_parking = db.query(Parking).filter(Parking.id_parking == id_parking, Parking.id_profile == id_profile).first()
        
    if not db_parking:
        raise HTTPException(status_code=404, detail="Parking not found or not owned by user")

    return SpaceCategoryService.get_monitoring_data(db, id_parking)

@router.get("/{id_parking}/realtime-occupancy")
def get_parking_realtime_occupancy(
    id_parking: int,
    db: Session = Depends(get_db),
    id_profile: int = Depends(verify_park_role),
    current_user: dict = Depends(get_current_user)
):
    role = current_user.get("role")
    
    # Verify ownership
    if role == "dev":
        db_parking = db.query(Parking).filter(Parking.id_parking == id_parking).first()
    else:
        db_parking = db.query(Parking).filter(Parking.id_parking == id_parking, Parking.id_profile == id_profile).first()
        
    if not db_parking:
        raise HTTPException(status_code=404, detail="Parking not found or not owned by user")
    
    # Query all active or pending bookings for this parking
    from app.models.booking import Booking
    from app.models.vehicle import Vehicle
    from app.models.user_profile import UserProfile
    from app.models.space_category import SpaceCategory

    # Parked vehicles (status = active)
    active_bookings = (
        db.query(Booking, Vehicle, UserProfile, SpaceCategory)
        .join(Vehicle, Booking.id_vehicle == Vehicle.id_vehicle)
        .join(UserProfile, Booking.id_profile == UserProfile.id_profile)
        .join(SpaceCategory, Booking.id_category == SpaceCategory.id_category)
        .filter(Booking.id_parking == id_parking, Booking.current_status == "active")
        .all()
    )

    parked_list = []
    for b, v, p, c in active_bookings:
        parked_list.append({
            "id_booking": b.id_booking,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "phone": p.phone,
            "license_plate": v.license_plate,
            "vehicle_model": v.model,
            "category_name": c.name,
            "start_time": b.expected_start_time.isoformat() if b.expected_start_time else None,
            "end_time": b.expected_end_time.isoformat() if b.expected_end_time else None,
            "applied_rate": float(b.applied_rate) if b.applied_rate is not None else 0.0
        })

    # Upcoming reservations (status = pending)
    pending_bookings = (
        db.query(Booking, Vehicle, UserProfile, SpaceCategory)
        .join(Vehicle, Booking.id_vehicle == Vehicle.id_vehicle)
        .join(UserProfile, Booking.id_profile == UserProfile.id_profile)
        .join(SpaceCategory, Booking.id_category == SpaceCategory.id_category)
        .filter(Booking.id_parking == id_parking, Booking.current_status == "pending")
        .all()
    )

    pending_list = []
    for b, v, p, c in pending_bookings:
        pending_list.append({
            "id_booking": b.id_booking,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "phone": p.phone,
            "license_plate": v.license_plate,
            "vehicle_model": v.model,
            "category_name": c.name,
            "start_time": b.expected_start_time.isoformat() if b.expected_start_time else None,
            "end_time": b.expected_end_time.isoformat() if b.expected_end_time else None,
            "applied_rate": float(b.applied_rate) if b.applied_rate is not None else 0.0
        })

    # Calculate total capacity and available spaces dynamically based on categories
    total_capacity = sum(cat.max_capacity for cat in SpaceCategoryService.get_categories_by_parking(db, id_parking))
    total_available = max(0, total_capacity - len(parked_list) - len(pending_list))

    return {
        "parking_name": db_parking.name,
        "total_capacity": total_capacity,
        "total_available": total_available,
        "parked_count": len(parked_list),
        "pending_count": len(pending_list),
        "currently_parked": parked_list,
        "upcoming_reservations": pending_list
    }
