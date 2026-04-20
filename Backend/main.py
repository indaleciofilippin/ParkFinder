from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers.auth_controller import router as auth_router
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer
from fastapi import Request, Depends, HTTPException, status
import os
from app.core.config import engine



# Crear tablas automáticamente si no existen

app = FastAPI(
    title="ParkFinder API",
    description="Backend API for ParkFinder application using OpenCV",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite cualquier origen (Simulador, Web Local, Docker network)
    allow_credentials=False, # Si usas cookies en lugar de JWT cambia esto a True y pon origenes especificos
    allow_methods=["*"],  # Incluye OPTIONS esencial para la pre-solicitud (preflight)
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

import os

async def jwt_middleware(request: Request, token: str = Depends(oauth2_scheme)):
    if request.url.path.startswith("/api/v1/auth/") or request.url.path.startswith("/api/v1/health") or request.url.path == "/":
        return
    try:
        SECRET_KEY = os.getenv("SECRET_KEY")
        ALGORITHM = os.getenv("ALGORITHM")
        if not SECRET_KEY or not ALGORITHM:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="JWT config missing")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        request.state.user = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# Include routers here
app.include_router(auth_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to ParkFinder API"}
