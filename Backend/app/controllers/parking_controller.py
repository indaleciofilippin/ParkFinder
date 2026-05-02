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

class ParkingUpdate(BaseModel):
    name: Optional[str] = None
    base_hourly_rate: Optional[float] = None
    is_active: Optional[bool] = None

class ParkingResponse(BaseModel):
    id_parking: int
    id_profile: int
    name: str
    base_hourly_rate: Decimal
    is_active: bool

    class Config:
        from_attributes = True

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
            base_hourly_rate=parking.base_hourly_rate
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[ParkingResponse])
def get_parkings(
    db: Session = Depends(get_db), 
    id_profile: int = Depends(get_current_profile)
):
    return ParkingService.get_user_parkings(db, id_profile=id_profile)

@router.get("/user/{id_profile}", response_model=List[ParkingResponse])
def get_parkings_by_user(
    id_profile: int, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    return ParkingService.get_user_parkings(db, id_profile=id_profile)

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
            is_active=parking.is_active
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
    id_profile: int = Depends(verify_park_role)
):
    deleted = ParkingService.delete_parking(db, id_parking=id_parking, id_profile=id_profile)
    if not deleted:
        raise HTTPException(status_code=404, detail="Parking not found or not owned by user")
    return {"msg": "Parking deleted successfully"}

@router.get("/{id_parking}/availability")
def get_parking_availability(
    id_parking: int,
    db: Session = Depends(get_db)
):
    availability = SpaceCategoryService.get_parking_availability(db, id_parking)
    if not availability["categories"] and not ParkingService.get_parking_by_id(db, id_parking):
        raise HTTPException(status_code=404, detail="Parking not found")
    return availability

@router.get("/availability/all")
def get_all_parkings_availability(
    db: Session = Depends(get_db)
):
    parkings = db.query(Parking).filter(Parking.is_active == True).all()
    results = []
    for p in parkings:
        results.append(SpaceCategoryService.get_parking_availability(db, p.id_parking))
    return results
