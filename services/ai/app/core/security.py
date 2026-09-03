from secrets import compare_digest

from fastapi import Header, HTTPException, status

from app.core.config import get_settings


async def require_internal_api_key(
    x_ai_internal_key: str | None = Header(default=None),
) -> None:
    settings = get_settings()

    if not settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Internal AI authentication is not configured",
        )

    if not x_ai_internal_key or not compare_digest(
        x_ai_internal_key,
        settings.internal_api_key,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key",
        )
