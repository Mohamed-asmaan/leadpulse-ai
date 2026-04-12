from fastapi import APIRouter

from app.api.v1.endpoints import analytics, auth, leads, metrics, public, tracking, users, verify, webhooks

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(leads.router, prefix="/leads")
api_router.include_router(webhooks.router)
api_router.include_router(analytics.router)
api_router.include_router(metrics.router)
api_router.include_router(verify.router)
api_router.include_router(public.router)
api_router.include_router(tracking.router)
api_router.include_router(users.router)
