"""Public (secret-gated) behavioral event ingest for websites and partner systems."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.ml.scoring_engine import recompute_after_new_signal
from app.models.lead import Lead
from app.schemas.tracking import PublicTrackEventIn, PublicTrackEventOut
from app.services.tracking.timeline import log_event

router = APIRouter(prefix="/public", tags=["Public Tracking"])


@router.post(
    "/track/event",
    response_model=PublicTrackEventOut,
    summary="Append a timeline event and re-score the lead (requires X-Tracking-Secret when configured)",
)
def public_track_event(
    body: PublicTrackEventIn,
    db: Session = Depends(get_db),
    x_tracking_secret: str | None = Header(default=None, alias="X-Tracking-Secret"),
) -> PublicTrackEventOut:
    secret = (settings.PUBLIC_TRACKING_SECRET or "").strip()
    if secret and (x_tracking_secret or "") != secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid tracking secret")

    lead = db.get(Lead, body.lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    ev = log_event(
        db,
        lead_id=lead.id,
        channel=body.channel.strip().lower(),
        event_type=body.event_type.strip().lower(),
        payload=body.payload,
        summary=body.summary or f"{body.event_type} via public tracking API",
    )
    updated = recompute_after_new_signal(db, lead.id)
    return PublicTrackEventOut(
        ok=True,
        event_id=ev.id,
        recomputed_score=updated.total_score if updated else lead.total_score,
        tier=(updated.tier if updated else lead.tier),
    )
