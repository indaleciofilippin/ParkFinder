from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.core.security import get_current_user
from sqlalchemy.orm import Session
from app.core.config import SessionLocal
from app.services.vehicle_service import VehicleService
from app.views.base_view import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class VehicleCreate(BaseModel):
    license_plate: str
    model: str

class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = None
    model: Optional[str] = None
    is_active: Optional[bool] = None

class VehicleResponse(BaseModel):
    id_vehicle: int
    id_profile: int
    license_plate: str
    model: str
    is_active: bool

    class Config:
        from_attributes = True

def get_current_profile(current_user: dict = Depends(get_current_user)):
    id_profile = current_user.get("id_profile")
    if id_profile is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Profile ID not found in token")
    return id_profile

def verify_driver_role(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    id_profile = current_user.get("id_profile")
    if role != "driver":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only drivers can perform this action")
    if id_profile is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Profile ID not found in token")
    return id_profile

@router.post("/", response_model=VehicleResponse)
def create_vehicle(
    vehicle: VehicleCreate, 
    db: Session = Depends(get_db), 
    id_profile: int = Depends(verify_driver_role)
):
    try:
        return VehicleService.create_vehicle(
            db,
            id_profile=id_profile, 
            license_plate=vehicle.license_plate, 
            model=vehicle.model
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[VehicleResponse])
def get_vehicles(
    db: Session = Depends(get_db), 
    id_profile: int = Depends(get_current_profile)
):
    return VehicleService.get_user_vehicles(db, id_profile=id_profile)

@router.get("/user/{id_profile}", response_model=List[VehicleResponse])
def get_vehicles_by_user(
    id_profile: int, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    return VehicleService.get_user_vehicles(db, id_profile=id_profile)

@router.put("/{id_vehicle}", response_model=VehicleResponse)
def update_vehicle(
    id_vehicle: int, 
    vehicle: VehicleUpdate, 
    db: Session = Depends(get_db), 
    id_profile: int = Depends(verify_driver_role)
):
    try:
        updated = VehicleService.update_vehicle(
            db, 
            id_vehicle=id_vehicle, 
            id_profile=id_profile, 
            license_plate=vehicle.license_plate, 
            model=vehicle.model,
            is_active=vehicle.is_active
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Vehicle not found or not owned by user")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{id_vehicle}")
def delete_vehicle(
    id_vehicle: int, 
    db: Session = Depends(get_db), 
    id_profile: int = Depends(verify_driver_role)
):
    deleted = VehicleService.delete_vehicle(db, id_vehicle=id_vehicle, id_profile=id_profile)
    if not deleted:
        raise HTTPException(status_code=404, detail="Vehicle not found or not owned by user")
    return {"msg": "Vehicle deleted successfully"}
