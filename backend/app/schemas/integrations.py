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
    meta_webhook_verify_configured: bool
    meta_app_secret_configured: bool
    website_form_secret_configured: bool


class AutomationWorkflowOut(BaseModel):
    """Built-in automation (Zoho-style workflow catalog — code-defined)."""

    id: str
    name: str
    trigger: str
    actions: list[str]
