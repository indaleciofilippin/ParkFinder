from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import SessionLocal
from app.services.space_category_service import SpaceCategoryService
from app.services.parking_service import ParkingService
from app.controllers.parking_controller import verify_park_role
from app.views.base_view import BaseModel
from typing import List, Optional
from decimal import Decimal

router = APIRouter(prefix="/parkings/{id_parking}/categories", tags=["Space Categories"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CategoryCreate(BaseModel):
    name: str
    max_capacity: int
    price_multiplier: float

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    max_capacity: Optional[int] = None
    price_multiplier: Optional[float] = None
    is_active: Optional[bool] = None

class CategoryResponse(BaseModel):
    id_category: int
    id_parking: int
    name: str
    max_capacity: int
    price_multiplier: Decimal
    is_active: bool

    class Config:
        from_attributes = True

def check_parking_ownership(id_parking: int, id_profile: int, db: Session):
    parking = ParkingService.get_parking_by_id(db, id_parking)
    if not parking or parking.id_profile != id_profile:
        raise HTTPException(status_code=404, detail="Parking not found or not owned by user")
    return parking

@router.post("/", response_model=CategoryResponse)
def create_category(
    id_parking: int,
    category: CategoryCreate,
    db: Session = Depends(get_db),
    id_profile: int = Depends(verify_park_role)
):
    check_parking_ownership(id_parking, id_profile, db)
    return SpaceCategoryService.create_category(
        db, id_parking, category.name, category.max_capacity, category.price_multiplier
    )

@router.get("/", response_model=List[CategoryResponse])
def get_categories(
    id_parking: int,
    db: Session = Depends(get_db)
):
    # Devuelve las categorías configuradas del estacionamiento (precios/capacidades)
    return SpaceCategoryService.get_categories_by_parking(db, id_parking)

@router.put("/{id_category}", response_model=CategoryResponse)
def update_category(
    id_parking: int,
    id_category: int,
    category: CategoryUpdate,
    db: Session = Depends(get_db),
    id_profile: int = Depends(verify_park_role)
):
    check_parking_ownership(id_parking, id_profile, db)
    updated = SpaceCategoryService.update_category(
        db, id_category, category.name, category.max_capacity, category.price_multiplier, category.is_active
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Category not found")
    return updated

@router.delete("/{id_category}")
def delete_category(
    id_parking: int,
    id_category: int,
    db: Session = Depends(get_db),
    id_profile: int = Depends(verify_park_role)
):
    check_parking_ownership(id_parking, id_profile, db)
    deleted = SpaceCategoryService.delete_category(db, id_category)
    if not deleted:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"msg": "Category deleted successfully"}
