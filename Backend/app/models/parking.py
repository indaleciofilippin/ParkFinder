from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey
from .base_model import BaseModel


class Parking(BaseModel):
    __tablename__ = "parking"
    id_parking = Column(Integer, primary_key=True, index=True)
    id_profile = Column(Integer, ForeignKey("user_profile.id_profile"), nullable=False)
    name = Column(String(100), nullable=False)
    base_hourly_rate = Column(Numeric(10,2), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    