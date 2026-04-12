from pydantic import BaseModel


class IntegrationStatusOut(BaseModel):
    """Which external capabilities are configured (never exposes secret values)."""

    hunter_configured: bool
    clearbit_configured: bool
    custom_enrichment_url_configured: bool
    resend_configured: bool
    twilio_configured: bool
    hot_sms_enabled: bool
    webhook_shared_secret_configured: bool
    public_tracking_secret_configured: bool
    synthetic_engagement_enabled: bool
