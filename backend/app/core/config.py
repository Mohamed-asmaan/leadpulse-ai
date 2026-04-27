from functools import lru_cache

from pydantic import model_validator
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
    ENVIRONMENT: str = "development"  # development | staging | production

    # Comma-separated browser origins for CORS, e.g. "http://localhost:3000,https://app.example.com".
    # Empty = wildcard "*" with credentials disabled (typical local dev). Set in production.
    CORS_ALLOW_ORIGINS: str = ""
    ALLOW_INSECURE_CORS_WILDCARD: bool = True

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

    # --- Meta (Facebook / Instagram) Lead Ads — Graph webhook ---
    # Page subscription verification: Meta sends hub.mode=subscribe & hub.verify_token; must echo hub.challenge.
    META_WEBHOOK_VERIFY_TOKEN: str = ""
    # App secret from Meta Developer app — used to verify X-Hub-Signature-256 on POST (recommended in production).
    META_APP_SECRET: str = ""

    # --- Website lead forms (Zoho-style public embed) ---
    # If set, POST /public/website-lead requires header X-Website-Form-Secret with this value.
    WEBSITE_FORM_SHARED_SECRET: str = ""
    REQUIRE_WEBHOOK_SECRET: bool = False

    # API protection / abuse control
    MAX_REQUEST_BODY_BYTES: int = 2_000_000  # 2 MB
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 120
    RATE_LIMIT_BURST_ALLOWANCE: int = 30
    REQUIRE_IDEMPOTENCY_FOR_WEBHOOKS: bool = True

    # Security response headers (HSTS should be on in TLS-only production)
    ENABLE_HSTS: bool = False
    HSTS_MAX_AGE_SECONDS: int = 31536000

    # Logging / audit
    ENABLE_AUDIT_LOGS: bool = True

    @model_validator(mode="after")
    def validate_security_baseline(self) -> "Settings":
        env = (self.ENVIRONMENT or "development").strip().lower()
        if env in {"staging", "production"}:
            if "change-me" in self.JWT_SECRET.lower() or len(self.JWT_SECRET) < 32:
                raise ValueError("JWT_SECRET must be a strong random value (>=32 chars) outside development.")
            if self.CORS_ALLOW_ORIGINS.strip() in {"", "*"} and not self.ALLOW_INSECURE_CORS_WILDCARD:
                raise ValueError("CORS wildcard is not allowed when ALLOW_INSECURE_CORS_WILDCARD is false.")
            if self.REQUIRE_WEBHOOK_SECRET and not self.WEBHOOK_SHARED_SECRET:
                raise ValueError("WEBHOOK_SHARED_SECRET is required when REQUIRE_WEBHOOK_SECRET=true.")
            if self.ENABLE_HSTS and self.HSTS_MAX_AGE_SECONDS < 86400:
                raise ValueError("HSTS_MAX_AGE_SECONDS must be >= 86400 in staging/production.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
