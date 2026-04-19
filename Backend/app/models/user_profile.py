from sqlalchemy import Column, Integer, Text, String, ForeignKey
from .base_model import BaseModel

class UserProfile(BaseModel):
    __tablename__ = "user_profile"
    id_profile = Column(Integer, primary_key=True, index=True)
    id_auth = Column(Integer, ForeignKey("user_auth.id_user_auth"), nullable=False)
    first_name = Column(Text, nullable=False)
    last_name = Column(Text, nullable=False)
    phone = Column(String(20), nullable=True)
