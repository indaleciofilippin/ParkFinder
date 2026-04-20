from sqlalchemy import Column, Integer, String
from .base_model import BaseModel

class Role(BaseModel):
    __tablename__ = "role"
    id_role = Column(Integer, primary_key=True, index=True)
    name = Column(String(10), unique=True, nullable=False)
