"""Capture → enrich → simulated engagement → score → automation → audit timeline."""

from __future__ import annotations

import secrets
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml.scoring_engine import score_lead
from app.models.lead import Lead
from app.models.qr_badge import QRBadgeToken
from app.services.enrichment.service import enrich_lead_row
from app.services.integrity import reconcile_lead_scores
from app.services.simulation import seed_synthetic_engagement_events
from app.services.tracking.timeline import log_event
from app.services.verification import apply_lead_authenticity_heuristics
from app.services.workflows.outreach import run_automation_for_lead


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
        summary="Lead persisted; pipeline queued enrich → engagement simulation → score → automation",
    )

    enrich_lead_row(db, lead)
    db.refresh(lead)
    log_event(
        db,
        lead_id=lead.id,
        channel="enrichment",
        event_type="enriched",
        payload={
            "industry": lead.industry,
            "company_size_estimate": lead.company_size_estimate,
            "provider": lead.enrichment_provider,
        },
        summary=f"Enrichment applied (provider={lead.enrichment_provider or 'unknown'})",
    )

    if settings.SYNTHETIC_ENGAGEMENT_ENABLED:
        seed_synthetic_engagement_events(db, lead)

    apply_lead_authenticity_heuristics(lead)
    db.add(lead)
    db.commit()
    db.refresh(lead)

    score_lead(db, lead)
    reconcile_lead_scores(lead)
    db.add(lead)
    db.commit()
    db.refresh(lead)

    log_event(
        db,
        lead_id=lead.id,
        channel="scoring",
        event_type="scored",
        payload={
            "total_score": lead.total_score,
            "tier": lead.tier,
            "fit": lead.fit_score,
            "intent": lead.intent_score,
            "engagement": lead.predictive_score,
        },
        summary=f"Composite score {lead.total_score}/100 — tier {lead.tier}",
    )

    run_automation_for_lead(db, lead)
    db.refresh(lead)

    if (lead.tier or "") == "hot":
        token = secrets.token_urlsafe(18)
        badge = QRBadgeToken(lead_id=lead.id, token=token, badge_type="lead_status")
        db.add(badge)
        db.commit()

    db.refresh(lead)
    return lead
