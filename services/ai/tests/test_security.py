import pytest
from fastapi import HTTPException

from app.core.security import require_internal_api_key


@pytest.mark.asyncio
async def test_missing_configuration_returns_503(monkeypatch) -> None:
    monkeypatch.setenv("AI_INTERNAL_API_KEY", "")

    from app.core.config import get_settings

    get_settings.cache_clear()

    with pytest.raises(HTTPException) as exc_info:
        await require_internal_api_key(None)

    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_missing_key_returns_401(monkeypatch) -> None:
    monkeypatch.setenv("AI_INTERNAL_API_KEY", "test-internal-key")

    from app.core.config import get_settings

    get_settings.cache_clear()

    with pytest.raises(HTTPException) as exc_info:
        await require_internal_api_key(None)

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_invalid_key_returns_401(monkeypatch) -> None:
    monkeypatch.setenv("AI_INTERNAL_API_KEY", "test-internal-key")

    from app.core.config import get_settings

    get_settings.cache_clear()

    with pytest.raises(HTTPException) as exc_info:
        await require_internal_api_key("wrong-key")

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_valid_key_is_accepted(monkeypatch) -> None:
    monkeypatch.setenv("AI_INTERNAL_API_KEY", "test-internal-key")

    from app.core.config import get_settings

    get_settings.cache_clear()

    result = await require_internal_api_key("test-internal-key")

    assert result is None
