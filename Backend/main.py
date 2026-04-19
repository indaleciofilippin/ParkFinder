from fastapi import FastAPI
from app.controllers import base_controller

app = FastAPI(
    title="ParkFinder API",
    description="Backend API for ParkFinder application using OpenCV",
    version="1.0.0"
)

# Include routers here
app.include_router(base_controller.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to ParkFinder API"}
