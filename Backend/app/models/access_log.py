from sqlalchemy import Column, Integer, String, DateTime
from .base_model import BaseModel
from sqlalchemy.sql import func 
class AccessLog(BaseModel):
    __tablename__ = "access_log"
    id_access_log = Column(Integer, primary_key=True, index=True, nullable=False)
    id_booking = Column(Integer, ForeignKey("booking.id_booking"), nullable=False)
    ai_read_plate = Column(String(10), nullable=False)
    actual_entry_time = Column(TIMESTAMP(timezone=True), nullable=False)
    actual_exit_time = Column(TIMESTAMP(timezone=True), nullable=False)