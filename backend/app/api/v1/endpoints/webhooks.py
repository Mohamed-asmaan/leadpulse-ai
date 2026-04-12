"""Inbound webhook listeners for ads platforms and custom forms."""

import json

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.schemas.lead import LeadDetailOut, LeadDuplicateOut
from app.services import lead_capture as lead_capture_service
from app.services.capture_normalize import normalize_incoming_lead_dict
from app.services.async_pipeline import run_lead_pipeline_background

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
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Body must be JSON") from exc

    try:
        payload, extras = normalize_incoming_lead_dict(body)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid lead payload: {exc}",
        ) from exc

    if x_ads_source and x_ads_source.strip():
        payload = payload.model_copy(update={"source": x_ads_source.strip()})

    dup = lead_capture_service.find_duplicate_lead(db, payload)
    if dup is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=LeadDuplicateOut(
                reason="A lead with this email already exists.",
                existing_lead_id=dup.id,
                matched_on="email",
            ).model_dump(mode="json"),
        )
    try:
        lead = lead_capture_service.create_lead(db, payload, capture_channel="webhook", extras=extras or None)
    except IntegrityError:
        db.rollback()
        dup = lead_capture_service.find_duplicate_lead(db, payload)
        if dup is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Lead could not be created due to a constraint conflict.",
            ) from None
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=LeadDuplicateOut(
                reason="A lead with this email already exists.",
                existing_lead_id=dup.id,
                matched_on="email",
            ).model_dump(mode="json"),
        ) from None

    background_tasks.add_task(
        run_lead_pipeline_background,
        str(lead.id),
        "webhook",
        "webhook_received",
    )
    return LeadDetailOut.model_validate(lead)
