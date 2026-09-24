from fastapi import APIRouter
from app.config import settings

router = APIRouter(tags=["health"])

@router.get("/health")
def get_health():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
