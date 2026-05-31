from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, Numeric
from .base_model import BaseModel


class Booking(BaseModel):
    __tablename__ = "booking"
    id_booking = Column(Integer, primary_key=True, index=True, nullable=False)
    id_profile = Column(Integer, ForeignKey("user_profile.id_profile"), nullable=False)
    id_vehicle = Column(Integer, ForeignKey("vehicle.id_vehicle"), nullable=False)
    id_parking = Column(Integer, ForeignKey("parking.id_parking"), nullable=False)
    id_category = Column(Integer, ForeignKey("space_category.id_category"), nullable=False)
    expected_start_time = Column(TIMESTAMP(timezone=True), nullable=True)
    expected_end_time = Column(TIMESTAMP(timezone=True), nullable=True)
    applied_rate = Column(Numeric(10,2), nullable=True)
    current_status = Column(String(15), nullable=True, default="pending")
