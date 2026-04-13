from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    auth,
    integrations_status,
    leads,
    meta_webhook,
    metrics,
    public,
    tracking,
    users,
    verify,
    webhooks,
    website_forms,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(leads.router, prefix="/leads")
api_router.include_router(webhooks.router)
api_router.include_router(meta_webhook.router)
api_router.include_router(analytics.router)
api_router.include_router(metrics.router)
api_router.include_router(verify.router)
api_router.include_router(public.router)
api_router.include_router(tracking.router)
api_router.include_router(website_forms.router)
api_router.include_router(users.router)
api_router.include_router(integrations_status.router)
