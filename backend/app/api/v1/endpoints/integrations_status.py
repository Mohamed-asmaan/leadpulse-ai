"""Adapted from Open Mercato-style “integration health” surfaces — booleans only, no secrets."""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.integrations import AutomationWorkflowOut, IntegrationStatusOut

router = APIRouter(prefix="/integrations", tags=["Integrations"])

_DEFAULT_WORKFLOWS: list[AutomationWorkflowOut] = [
    AutomationWorkflowOut(
        id="capture_pipeline",
        name="Lead capture pipeline",
        trigger="lead_created (API, webhook, Meta, or website)",
        actions=[
            "Append timeline (lead_created)",
            "Enrich firmographics",
            "Optional synthetic engagement (dev)",
            "Authenticity heuristics",
            "Score (fit + intent + engagement, optional ML blend)",
            "Tier-based outreach (hot email/SMS, warm nurture, cold bucket)",
            "QR badge token for HOT tier",
        ],
    ),
    AutomationWorkflowOut(
        id="behavior_rescore",
        name="Website / ads engagement",
        trigger="public track event or POST /leads/{id}/events",
        actions=["Append LeadEvent", "Recompute scores", "Reconcile integrity"],
    ),
]


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
        meta_webhook_verify_configured=bool(settings.META_WEBHOOK_VERIFY_TOKEN.strip()),
        meta_app_secret_configured=bool(settings.META_APP_SECRET.strip()),
        website_form_secret_configured=bool(settings.WEBSITE_FORM_SHARED_SECRET.strip()),
    )


@router.get("/workflows", response_model=list[AutomationWorkflowOut])
def list_automation_workflows(_user: User = Depends(get_current_user)) -> list[AutomationWorkflowOut]:
    """Built-in automations (no visual builder yet — CRM-style catalog for docs and UI)."""
    return list(_DEFAULT_WORKFLOWS)
