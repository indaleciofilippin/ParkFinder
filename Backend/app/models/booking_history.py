from sqlalchemy import Column, Integer, String
from .base_model import BaseModel

class BookingHistory(BaseModel):
    __tablename__ = "booking_history"
    id_history = Column(Integer, primary_key=True, index=True, nullable=False)
    id_booking = Column(Integer, ForeignKey("booking.id_booking"), nullable=False)
    status = Column(String(10), nullable=False)
    changed_at = Column(TIMESTAMP(timezone=True), nullable=False)