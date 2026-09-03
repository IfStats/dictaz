from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.internal import router as internal_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Dictaz AI",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(internal_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": settings.service_name,
        "status": "ok",
    }
