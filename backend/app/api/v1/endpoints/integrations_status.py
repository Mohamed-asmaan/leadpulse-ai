"""Adapted from Open Mercato-style “integration health” surfaces — booleans only, no secrets."""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.integrations import IntegrationStatusOut

router = APIRouter(prefix="/integrations", tags=["Integrations"])


@router.get("/status", response_model=IntegrationStatusOut)
def integration_status(_user: User = Depends(get_current_user)) -> IntegrationStatusOut:
    return IntegrationStatusOut(
        hunter_configured=bool(settings.HUNTER_API_KEY.strip()),
        clearbit_configured=bool(settings.CLEARBIT_API_KEY.strip()),
        custom_enrichment_url_configured=bool(settings.ENRICHMENT_API_URL.strip()),
        resend_configured=bool(settings.RESEND_API_KEY.strip() and settings.RESEND_FROM_EMAIL.strip()),
        twilio_configured=bool(
            settings.TWILIO_ACCOUNT_SID.strip()
            and settings.TWILIO_AUTH_TOKEN.strip()
            and settings.TWILIO_FROM_NUMBER.strip()
        ),
        hot_sms_enabled=bool(settings.HOT_OUTREACH_SMS_ENABLED),
        webhook_shared_secret_configured=bool(settings.WEBHOOK_SHARED_SECRET.strip()),
        public_tracking_secret_configured=bool(settings.PUBLIC_TRACKING_SECRET.strip()),
        synthetic_engagement_enabled=bool(settings.SYNTHETIC_ENGAGEMENT_ENABLED),
    )
