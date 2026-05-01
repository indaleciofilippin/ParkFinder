from sqlalchemy import Column, Integer, String, ForeignKey
from .base_model import BaseModel

class Address(BaseModel):
    __tablename__ = "address"
    id_address = Column(Integer, primary_key=True, index=True, nullable=False)
    id_parking = Column(Integer, ForeignKey("parking.id_parking"), nullable=False)
    street = Column(String(100), nullable=False)
    city = Column(String(50), nullable=False)
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)