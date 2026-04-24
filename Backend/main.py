from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers.auth_controller import router as auth_router
from app.controllers.vehicle_controller import router as vehicle_router
from fastapi import Request, Depends, HTTPException, status
from app.core.security import get_current_user, oauth2_scheme
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

async def jwt_middleware(request: Request, token: str = Depends(oauth2_scheme)):
    if request.url.path.startswith("/api/v1/auth/") or request.url.path.startswith("/api/v1/health") or request.url.path == "/":
        return
    payload = await get_current_user(token)
    request.state.user = payload.get("sub")
    request.state.role = payload.get("role")
    request.state.id_profile = payload.get("id_profile")

# Include routers here
app.include_router(auth_router, prefix="/api/v1")
app.include_router(vehicle_router, prefix="/api/v1", dependencies=[Depends(jwt_middleware)])

@app.get("/")
def read_root():
    return {"message": "Welcome to ParkFinder API"}
