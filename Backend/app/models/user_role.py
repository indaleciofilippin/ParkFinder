from sqlalchemy import Column, Integer, ForeignKey
from .base_model import BaseModel

class UserRole(BaseModel):
    __tablename__ = "user_role"
    id_user_role = Column(Integer, primary_key=True, index=True)
    id_auth = Column(Integer, ForeignKey("user_auth.id_user_auth"), nullable=False)
    id_role = Column(Integer, ForeignKey("role.id_role"), nullable=False)
