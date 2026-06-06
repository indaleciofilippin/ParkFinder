from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.controllers.auth_controller import router as auth_router
from app.controllers.vehicle_controller import router as vehicle_router
from app.controllers.parking_controller import router as parking_router
from app.controllers.booking_controller import router as booking_router
from app.controllers.space_category_controller import router as space_category_router
from fastapi import Request, Depends, HTTPException, status
from app.core.security import get_current_user, oauth2_scheme
import os
from app.core.config import engine, SessionLocal
from app.services.booking_service import BookingService
import asyncio
from contextlib import asynccontextmanager

async def no_show_cron():
    """Background task to process no-shows every 60 seconds."""
    while True:
        try:
            db = SessionLocal()
            try:
                BookingService.process_no_shows(db)
            finally:
                db.close()
        except Exception as e:
            print(f"⚠️ [CRON] Error in no_show_cron: {e}")
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(no_show_cron())
    yield
    # Shutdown
    task.cancel()

# Crear tablas automáticamente si no existen

app = FastAPI(
    title="ParkFinder API",
    description="Backend API for ParkFinder application using OpenCV",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite cualquier origen (Simulador, Web Local, Docker network)
    allow_credentials=False, # Si usas cookies en lugar de JWT cambia esto a True y pon origenes especificos
    allow_methods=["*"],  # Incluye OPTIONS esencial para la pre-solicitud (preflight)
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    if errors:
        first_error_msg = errors[0].get("msg", "Error de validación")
        if first_error_msg.lower().startswith("value error, "):
            first_error_msg = first_error_msg[13:]
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": first_error_msg}
        )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)}
    )

async def jwt_middleware(request: Request):
    # Allow completely public access to authentication, health checks, and AI barrier endpoints
    if request.url.path.startswith("/api/v1/auth/") or "/barrier" in request.url.path or request.url.path.startswith("/api/v1/health") or request.url.path == "/":
        return
        
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = auth_header.split(" ")[1]
    payload = await get_current_user(token)
    request.state.user = payload.get("sub")
    request.state.role = payload.get("role")
    request.state.id_profile = payload.get("id_profile")

# Include routers here
app.include_router(auth_router, prefix="/api/v1")
app.include_router(vehicle_router, prefix="/api/v1", dependencies=[Depends(jwt_middleware)])
app.include_router(parking_router, prefix="/api/v1", dependencies=[Depends(jwt_middleware)])
app.include_router(booking_router, prefix="/api/v1", dependencies=[Depends(jwt_middleware)])
app.include_router(space_category_router, prefix="/api/v1", dependencies=[Depends(jwt_middleware)])

@app.get("/")
def read_root():
    return {"message": "Welcome to ParkFinder API"}
