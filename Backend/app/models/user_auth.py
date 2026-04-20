from sqlalchemy import Column, Integer, String, Boolean


from .base_model import BaseModel

class UserAuth(BaseModel):
    __tablename__ = "user_auth"
    id_user_auth = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String)
    is_active = Column(Boolean, default=True, nullable=False)
    auth_provider = Column(String, nullable=False)
    provider_id = Column(String(255), unique=True, nullable=True)
