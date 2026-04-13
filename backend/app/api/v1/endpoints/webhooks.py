"""Inbound webhook listeners for ads platforms and custom forms."""

import json

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.schemas.lead import LeadDetailOut
from app.services.async_pipeline import run_lead_pipeline_background
from app.services.webhook_ingest import (
    LeadDuplicateError,
    duplicate_http_exception,
    json_parse_error,
    normalize_error_http,
    normalize_webhook_json,
    persist_webhook_lead,
)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post(
    "/leads",
    response_model=LeadDetailOut,
    status_code=status.HTTP_201_CREATED,
    summary="Ads / partner webhook ingestion (accepts loose JSON + vendor fields)",
)
async def webhook_capture_lead(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_ads_source: str | None = Header(default=None, alias="X-Ads-Source"),
    x_webhook_token: str | None = Header(default=None, alias="X-Webhook-Token"),
) -> LeadDetailOut:
    if settings.WEBHOOK_SHARED_SECRET and (x_webhook_token or "") != settings.WEBHOOK_SHARED_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook token")

    try:
        body = await request.json()
    except json.JSONDecodeError as exc:
        raise json_parse_error(exc) from exc

    try:
        payload, extras = normalize_webhook_json(body)
    except ValueError as exc:
        raise normalize_error_http(exc) from exc

    if x_ads_source and x_ads_source.strip():
        payload = payload.model_copy(update={"source": x_ads_source.strip()})

    try:
        lead = persist_webhook_lead(db, payload, extras=extras, capture_channel="webhook")
    except LeadDuplicateError as dup:
        raise duplicate_http_exception(dup.existing_lead_id) from dup

    background_tasks.add_task(
        run_lead_pipeline_background,
        str(lead.id),
        "webhook",
        "webhook_received",
    )
    return LeadDetailOut.model_validate(lead)
