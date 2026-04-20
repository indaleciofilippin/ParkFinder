from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.core.config import SessionLocal
from app.models.user_auth import UserAuth
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.user_profile import UserProfile
from app.services.user_auth_service import UserAuthService
from app.views.base_view import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import os
from pydantic import EmailStr, ValidationError, validator
from app.views.base_view import BaseModel
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter(prefix="/auth", tags=["Auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class UserAuthView(BaseModel):
    id_user_auth: int
    email: str
    is_active: bool
    auth_provider: str
    provider_id: Optional[str] = None

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    users = UserAuthService.get_all(db)
    return [UserAuthView.from_orm(u).dict() for u in users]

@router.get("/db-info")
def get_db_info():
    db_url = os.getenv("DATABASE_URL", "NOT_FOUND")
    # Ofuscar el password por seguridad
    safe_url = db_url.split("@")[-1] if "@" in db_url else db_url
    return {"active_db_host": safe_url}

@router.get("/users/{user_id}")
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    user = UserAuthService.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserAuthView.from_orm(user).dict()



def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = UserAuthService.get_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    # Obtener el rol del usuario
    user_role = db.query(UserRole).filter_by(id_auth=user.id_user_auth).first()
    role = None
    if user_role:
        role_obj = db.query(Role).filter_by(id_role=user_role.id_role).first()
        if role_obj:
            role = role_obj.name
    access_token = create_access_token(data={"sub": user.email, "role": role})
    return {"access_token": access_token, "token_type": "bearer"}

class RegisterRequest(BaseModel):
    email: EmailStr
    auth_provider: str
    password: Optional[str] = None
    provider_id: Optional[str] = None
    first_name: str = ""
    last_name: str = ""

    @validator("auth_provider")
    def provider_must_be_valid(cls, v):
        allowed = {"local", "google", "apple"}
        if v not in allowed:
            raise ValueError("auth_provider must be 'local', 'google', or 'apple'")
        if not (2 <= len(v) <= 50):
            raise ValueError("auth_provider length must be 2-50 chars")
        return v

    @validator("password")
    def password_val(cls, v, values):
        provider = values.get("auth_provider")
        if provider == "local":
            if not v or len(v) < 8:
                raise ValueError("Password must be at least 8 characters")
        return v

    @validator("provider_id")
    def provider_id_length(cls, v, values):
        provider = values.get("auth_provider")
        if provider in ["google", "apple"] and not v:
            raise ValueError("provider_id is required for social login")
        if v is not None and not (2 <= len(v) <= 255):
            raise ValueError("provider_id length must be 2-255 chars")
        return v

@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if UserAuthService.get_by_email(db, data.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    try:
        UserAuthService.register_user(db, data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"msg": "User registered successfully"}

class SocialLoginRequest(BaseModel):
    email: EmailStr
    auth_provider: str
    provider_id: str
    first_name: str = ""
    last_name: str = ""

@router.post("/social-login")
def social_login(data: SocialLoginRequest, db: Session = Depends(get_db)):
    user = UserAuthService.get_by_email(db, data.email)
    
    # Auto-Registro: Si el email no está registrado, lo registramos dinámicamente con Google/Apple
    if not user:
        register_data = RegisterRequest(
            email=data.email,
            auth_provider=data.auth_provider,
            password=None,
            provider_id=data.provider_id,
            first_name=data.first_name,
            last_name=data.last_name
        )
        try:
            UserAuthService.register_user(db, register_data)
            user = UserAuthService.get_by_email(db, data.email)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Auto-registration failed: {str(e)}")
            
    # Validamos que los IDs criptográficos correspondan
    if user.auth_provider != data.auth_provider or user.provider_id != data.provider_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid social login credentials")
        
    # Obtener el rol del usuario
    user_role = db.query(UserRole).filter_by(id_auth=user.id_user_auth).first()
    role = None
    if user_role:
        role_obj = db.query(Role).filter_by(id_role=user_role.id_role).first()
        if role_obj:
            role = role_obj.name
            
    access_token = create_access_token(data={"sub": user.email, "role": role})
    return {"access_token": access_token, "token_type": "bearer"}
