from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "dictaz-ai"
    environment: str = "development"
    host: str = "127.0.0.1"
    port: int = 8001

    deepseek_api_key: str | None = None
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_primary_model: str = "deepseek-v4-pro"
    deepseek_fast_model: str = "deepseek-v4-flash"
    deepseek_vision_model: str = "deepseek-v4-flash-vision-exp"

    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str | None = None

    anthropic_api_key: str | None = None
    anthropic_model: str | None = None

    redis_url: str = "redis://localhost:6379/0"
    database_url: str | None = None
    internal_api_key: str | None = Field(default=None, validation_alias="AI_INTERNAL_API_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
