from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, TIMESTAMP
from .base_model import BaseModel

class PaymentTransaction(BaseModel):
    __tablename__ = "payment_transaction"
    id_transaction = Column(Integer, primary_key=True, index=True, nullable=False)
    id_invoice = Column(Integer, ForeignKey("invoice.id_invoice"), nullable=False)
    gateway_reference = Column(String(100), nullable=False)
    payment_method = Column(String(100), nullable=False)
    amount_attemped = Column(Numeric(10,2), nullable=False)
    status = Column(String(8), nullable=False)
    attemped_at = Column(TIMESTAMP(timezone=True), nullable=False)