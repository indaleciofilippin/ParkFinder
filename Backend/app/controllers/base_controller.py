from fastapi import APIRouter
from app.views.base_view import HealthCheckResponse

router = APIRouter(
    prefix="/health",
    tags=["Health"]
)

@router.get("/", response_model=HealthCheckResponse)
async def check_health():
    """
    Check the health of the API service.
    """
    return HealthCheckResponse(status="ok", message="Service is running healthy")
