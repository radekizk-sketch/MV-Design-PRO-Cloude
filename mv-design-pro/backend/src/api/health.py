"""Health endpoint — prosty status dla smoke checks."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def health_check() -> dict[str, str]:
    """Lekki health check (bez DB/UoW)."""
    return {"status": "ok"}
