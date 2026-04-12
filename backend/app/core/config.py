from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "LeadPulse AI"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./leadpulse_dev.db"

    JWT_SECRET: str = "change-me-in-production-use-long-random-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Ideal Customer Profile (comma-separated industries, lowercase)
    ICP_INDUSTRIES: str = "technology,software,information technology,finance,fintech"
    ICP_COMPANY_SIZE_MIN: int = 50
    ICP_COMPANY_SIZE_MAX: int = 5000

    ENRICHMENT_API_URL: str = ""
    ENRICHMENT_API_TIMEOUT_SECONDS: float = 0.75

    HOT_SCORE_MIN: int = 75
    WARM_SCORE_MIN: int = 45

    # If set, inbound webhooks must send header `X-Webhook-Token` with this value.
    WEBHOOK_SHARED_SECRET: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
