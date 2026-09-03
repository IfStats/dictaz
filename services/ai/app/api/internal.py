
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.security import require_internal_api_key
from app.providers.deepseek import DeepSeekProvider

router = APIRouter(
    prefix="/internal",
    tags=["internal"],
    dependencies=[Depends(require_internal_api_key)],
)


class GenerateRequest(BaseModel):
    system_prompt: str = Field(min_length=1, max_length=50_000)
    user_prompt: str = Field(min_length=1, max_length=100_000)
    model: str = Field(min_length=1, max_length=100)
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)


class GenerateResponse(BaseModel):
    content: str
    model: str
    provider: str


ALLOWED_MODELS = {
    "deepseek-v4-pro",
    "deepseek-v4-flash",
    "deepseek-v4-flash-vision-exp",
}


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    request: GenerateRequest,
) -> GenerateResponse:
    if request.model not in ALLOWED_MODELS:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported AI model",
        )

    provider = DeepSeekProvider()
    result = await provider.generate(
        system_prompt=request.system_prompt,
        user_prompt=request.user_prompt,
        model=request.model,
        temperature=request.temperature,
    )

    return GenerateResponse(
        content=result.content,
        model=result.model,
        provider=result.provider,
    )
