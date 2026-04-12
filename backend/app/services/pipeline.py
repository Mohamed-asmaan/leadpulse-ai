"""End-to-end lead lifecycle orchestration (capture → enrich → score → outreach)."""

from __future__ import annotations

import secrets
from uuid import UUID

from sqlalchemy.orm import Session

from app.ml.scoring_engine import score_lead
from app.models.lead import Lead
from app.models.qr_badge import QRBadgeToken
from app.services.enrichment.service import enrich_lead_row
from app.services.integrity import reconcile_lead_scores
from app.services.tracking.timeline import log_event
from app.services.verification import apply_lead_authenticity_heuristics
from app.services.workflows.outreach import trigger_hot_outreach


def process_lead_pipeline(
    db: Session,
    lead_id: UUID,
    *,
    ingest_channel: str,
    ingest_event_type: str,
) -> Lead:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise ValueError("Lead not found for pipeline processing")

    log_event(
        db,
        lead_id=lead.id,
        channel=ingest_channel,
        event_type="lead_created",
        payload={
            "source": lead.source,
            "capture_channel": lead.capture_channel,
            "ingest": ingest_event_type,
            "integrity_sha256": lead.integrity_sha256,
        },
        summary="Lead captured; real-time pipeline started (enrich → score → respond)",
    )

    enrich_lead_row(db, lead)
    apply_lead_authenticity_heuristics(lead)
    db.add(lead)
    db.commit()
    db.refresh(lead)

    score_lead(db, lead)
    reconcile_lead_scores(lead)
    db.add(lead)
    db.commit()
    db.refresh(lead)

    trigger_hot_outreach(db, lead)

    if (lead.tier or "") == "hot":
        token = secrets.token_urlsafe(18)
        badge = QRBadgeToken(lead_id=lead.id, token=token, badge_type="lead_status")
        db.add(badge)
        db.commit()

    db.refresh(lead)
    return lead
