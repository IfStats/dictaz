from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.config import Settings
from app.providers.deepseek import DeepSeekProvider


@pytest.mark.asyncio
async def test_deepseek_generate_maps_response() -> None:
    settings = Settings(
        deepseek_api_key="test-key",
        deepseek_base_url="https://api.deepseek.com",
    )

    provider = DeepSeekProvider(settings)

    mock_response = SimpleNamespace(
        choices=[
            SimpleNamespace(message=SimpleNamespace(content="Generated Dictaz content"))
        ],
        model="deepseek-v4-pro",
    )

    provider.client.chat.completions.create = AsyncMock(return_value=mock_response)

    result = await provider.generate(
        system_prompt="You are a technology editor.",
        user_prompt="Explain AI agents.",
        model="deepseek-v4-pro",
        temperature=0.2,
    )

    provider.client.chat.completions.create.assert_awaited_once_with(
        model="deepseek-v4-pro",
        temperature=0.2,
        messages=[
            {"role": "system", "content": "You are a technology editor."},
            {"role": "user", "content": "Explain AI agents."},
        ],
    )

    assert result.content == "Generated Dictaz content"
    assert result.model == "deepseek-v4-pro"
    assert result.provider == "deepseek"


def test_deepseek_requires_api_key() -> None:
    settings = Settings(deepseek_api_key=None)

    with pytest.raises(ValueError, match="DEEPSEEK_API_KEY is not configured"):
        DeepSeekProvider(settings)
