from sqlalchemy import Column, Integer, String, Numeric, TIMESTAMP, ForeignKey
from .base_model import BaseModel

class Invoice(BaseModel):
    __tablename__ = "invoice"
    id_invoice = Column(Integer, primary_key=True, index=True, nullable=False)
    subtotal_parking = Column(Numeric(10,2), nullable=False)
    service_fee = Column(Numeric(10,2), nullable=False)
    total_amount = Column(Numeric(10,2), nullable=False)
    platform_revenue = Column(Numeric(10,2), nullable=False)
    payment_status = Column(String(10), nullable=False)
    issued_at = Column(TIMESTAMP(timezone=True), nullable=False)
    id_booking = Column(Integer, ForeignKey("booking.id_booking"), nullable=False)