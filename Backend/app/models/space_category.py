from sqlalchemy import Column, Integer, String
from .base_model import BaseModel

class SpaceCategory(BaseModel):
    __tablename__ = "space_category"
    id_category = Column(Integer, primary_key=True, index=True, nullable=False)
    id_parking = Column(Integer, ForeignKey("parking.id_parking"), nullable=False)
    name = Column(String(50), nullable=False)
    price_multiplier = Column(Numeric(10,2), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)