"""Meta (Facebook / Instagram) Lead Ads — Graph API webhook verify + signed POST."""

from __future__ import annotations

import hashlib
import hmac
import json

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request, Response, status
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

router = APIRouter(prefix="/webhooks", tags=["Meta Lead Ads"])


def _meta_signature_valid(app_secret: str, raw_body: bytes, signature_header: str | None) -> bool:
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(app_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    try:
        sig = signature_header.strip()
        exp_b = expected.encode("ascii")
        sig_b = sig.encode("ascii")
        if len(exp_b) != len(sig_b):
            return False
        return hmac.compare_digest(exp_b, sig_b)
    except (UnicodeEncodeError, UnicodeDecodeError, TypeError, ValueError):
        return False


@router.get(
    "/meta",
    summary="Meta Page webhook verification (subscribe challenge)",
    response_class=Response,
)
def meta_webhook_verify(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
) -> Response:
    expected = (settings.META_WEBHOOK_VERIFY_TOKEN or "").strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="META_WEBHOOK_VERIFY_TOKEN is not configured on this server.",
        )
    if (hub_mode or "").lower() == "subscribe" and (hub_verify_token or "") == expected and hub_challenge:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification failed")


@router.post(
    "/meta",
    response_model=LeadDetailOut,
    status_code=status.HTTP_201_CREATED,
    summary="Meta Lead Ads delivery (field_data JSON); verifies X-Hub-Signature-256 when META_APP_SECRET is set",
)
async def meta_webhook_lead(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_hub_signature_256: str | None = Header(default=None, alias="X-Hub-Signature-256"),
) -> LeadDetailOut:
    raw = await request.body()
    secret = (settings.META_APP_SECRET or "").strip()
    if secret:
        if not _meta_signature_valid(secret, raw, x_hub_signature_256):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Meta signature")
    try:
        body = json.loads(raw.decode("utf-8")) if raw else {}
    except json.JSONDecodeError as exc:
        raise json_parse_error(exc) from exc

    if not isinstance(body, dict):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Body must be a JSON object")

    try:
        payload, extras = normalize_webhook_json(body)
    except ValueError as exc:
        raise normalize_error_http(exc) from exc

    try:
        lead = persist_webhook_lead(db, payload, extras=extras, capture_channel="meta")
    except LeadDuplicateError as dup:
        raise duplicate_http_exception(dup.existing_lead_id) from dup

    background_tasks.add_task(
        run_lead_pipeline_background,
        str(lead.id),
        "meta",
        "meta_leadgen_webhook",
    )
    return LeadDetailOut.model_validate(lead)
