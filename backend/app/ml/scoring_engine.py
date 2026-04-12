"""LeadPulse scoring: 40% ICP fit, 30% intent (capture metadata), 30% engagement (timeline + simulation)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.lead import Lead
from app.models.lead_event import LeadEvent


def _icp_industries() -> list[str]:
    return [x.strip().lower() for x in settings.ICP_INDUSTRIES.split(",") if x.strip()]


def compute_fit(lead: Lead) -> tuple[int, str]:
    """ICP alignment 0–100 (industry + company size band)."""
    industries = _icp_industries()
    ind = (lead.industry or "").lower()
    match = any(i in ind or ind in i for i in industries) if ind else False
    size = lead.company_size_estimate or 0
    smin, smax = settings.ICP_COMPANY_SIZE_MIN, settings.ICP_COMPANY_SIZE_MAX
    size_ok = smin <= size <= smax if size else False

    score = 0
    parts: list[str] = []
    if match:
        score += 55
        parts.append(
            f"Industry '{ind}' aligns with the configured ICP focus ({', '.join(industries[:4])})."
        )
    else:
        parts.append("Industry signal is weak or outside the primary ICP list, reducing fit.")

    if size_ok:
        score += 45
        parts.append(f"Estimated headcount ({size}) is within the ICP band {smin}-{smax}.")
    elif size:
        parts.append(f"Estimated headcount ({size}) deviates from the ideal {smin}-{smax} band.")
    else:
        parts.append("Company size is unknown after enrichment, so fit is partially discounted.")

    return max(0, min(100, score)), " ".join(parts)


def compute_intent_from_metadata(lead: Lead) -> tuple[int, str]:
    """
    Intent 0–100 from capture surfaces (pricing / demo / trial signals).
    Backend-only — no browser tricks.
    """
    blob = f"{lead.source} {(lead.company or '')} {lead.name} {(lead.notes or '')}".lower()
    score = 0
    bits: list[str] = []
    if any(k in blob for k in ("pricing", "price", "quote", "cost", "budget")):
        score += 38
        bits.append("Pricing or commercial language detected in capture metadata (+38).")
    if any(k in blob for k in ("demo", "trial", "walkthrough", "meeting", "calendar", "book")):
        score += 42
        bits.append("Demo / meeting / trial intent inferred from metadata (+42).")
    if any(k in blob for k in ("urgent", "asap", "today", "now")):
        score += 15
        bits.append("Urgency language increases inferred purchase intent (+15).")
    if not bits:
        bits.append("No strong demo/pricing keywords in source or company fields; intent is baseline.")
    return max(0, min(100, score)), " ".join(bits)


def compute_engagement_from_timeline(db: Session, lead_id) -> tuple[int, str]:
    """
    Engagement 0–100 from behavioral timeline (opens, clicks, replies, meetings).
    Includes rows logged by seed_synthetic_engagement_events.
    """
    weights: dict[str, int] = {
        "email_open": 14,
        "email_click": 24,
        "reply": 40,
        "meeting_booked": 55,
        "page_visit": 10,
        "form_submit": 18,
    }
    rows = (
        db.query(LeadEvent.event_type, func.count())
        .filter(LeadEvent.lead_id == lead_id)
        .group_by(LeadEvent.event_type)
        .all()
    )
    total = 0
    breakdown: list[str] = []
    for et, c in rows:
        w = weights.get(et, 0)
        if w == 0:
            continue
        add = min(int(c) * w, 85)
        total += add
        breakdown.append(f"{et.replace('_', ' ')} ×{int(c)} (weight {w})")
    total = min(100, total)
    reason = (
        "Engagement score aggregates weighted timeline signals: "
        + ("; ".join(breakdown) if breakdown else "no engagement-class events yet (simulation may still be running).")
    )
    return int(total), reason


def score_lead(db: Session, lead: Lead) -> Lead:
    fit, fit_reason = compute_fit(lead)
    intent, intent_reason = compute_intent_from_metadata(lead)
    engagement, engagement_reason = compute_engagement_from_timeline(db, lead.id)

    total = int(round(0.40 * fit + 0.30 * intent + 0.30 * engagement))
    total = max(0, min(100, total))
    tier = "cold"
    if total >= settings.HOT_SCORE_MIN:
        tier = "hot"
    elif total >= settings.WARM_SCORE_MIN:
        tier = "warm"

    summary = (
        f"Score {total}/100 ({tier.upper()}). Weighted blend: 40% fit ({fit}), 30% intent ({intent}), "
        f"30% engagement ({engagement}). "
        f"Fit: {fit_reason[:140]}…"
    )

    lead.fit_score = fit
    lead.intent_score = intent
    lead.predictive_score = engagement  # column reused as engagement dimension (API + UI label)
    lead.total_score = total
    lead.tier = tier
    lead.fit_reason = fit_reason
    lead.intent_reason = intent_reason
    lead.predictive_reason = engagement_reason
    lead.score_summary = summary
    lead.scored_at = datetime.now(timezone.utc)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def recompute_after_new_signal(db: Session, lead_id) -> Lead | None:
    from app.services.integrity import reconcile_lead_scores

    lead = db.get(Lead, lead_id)
    if lead is None:
        return None
    score_lead(db, lead)
    reconcile_lead_scores(lead)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead
