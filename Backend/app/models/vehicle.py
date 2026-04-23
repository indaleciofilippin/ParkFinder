from sqlalchemy import Column, Integer, ForeignKey
from .base_model import BaseModel

class Vehicle(BaseModel):
    __tablename__ = "vehicle"
    id_vehicle = Column(Integer, primary_key=True, index=True)
    id_profile = Column(Integer, ForeignKey("user_profile.id_profile"), nullable=False)
    license_plate = Column(String(10), nullable=False, unique=True)
    model = Column(String(20), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)