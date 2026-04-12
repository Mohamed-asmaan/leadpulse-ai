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

    # Hunter.io (email finder + company). https://hunter.io/api-documentation
    HUNTER_API_KEY: str = ""
    # Clearbit Enrichment (combined person+company). Optional second source.
    CLEARBIT_API_KEY: str = ""

    # --- Outreach (Module 4) ---
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = ""
    HOT_OUTREACH_SMS_ENABLED: bool = False
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    # --- ML blend (Module 3) — 0 = rules only, 1 = ML probability drives total entirely ---
    ML_BLEND_WEIGHT: float = 0.55

    # --- Engagement simulation (Module 5) — disable in production when real tracking is wired ---
    SYNTHETIC_ENGAGEMENT_ENABLED: bool = True

    # --- Public tracking ingest (website / partners) ---
    PUBLIC_TRACKING_SECRET: str = ""

    HOT_SCORE_MIN: int = 80
    WARM_SCORE_MIN: int = 50

    # If set, inbound webhooks must send header `X-Webhook-Token` with this value.
    WEBHOOK_SHARED_SECRET: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
