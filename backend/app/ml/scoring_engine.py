"""Three-dimensional scoring (fit, intent, predictive) with lightweight XAI."""

from __future__ import annotations

import math
from datetime import datetime, timezone

import numpy as np
from sklearn.linear_model import LogisticRegression
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.lead import Lead
from app.models.lead_event import LeadEvent

_MODEL: LogisticRegression | None = None


def _model() -> LogisticRegression:
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    rng = np.random.default_rng(42)
    n = 5000
    fit = rng.random(n)
    intent = rng.random(n)
    log_size = rng.uniform(1.5, 4.0, size=n)
    x = np.column_stack([fit, intent, np.clip(log_size / 4.0, 0, 1)])
    z = 2.4 * x[:, 0] + 1.9 * x[:, 1] + 0.85 * x[:, 2] - 1.65
    p = 1 / (1 + np.exp(-z))
    y = ((p + rng.normal(0, 0.06, size=n)) > 0.55).astype(int)
    m = LogisticRegression(max_iter=500, class_weight="balanced")
    m.fit(x, y)
    _MODEL = m
    return m


def _icp_industries() -> list[str]:
    return [x.strip().lower() for x in settings.ICP_INDUSTRIES.split(",") if x.strip()]


def compute_fit(lead: Lead) -> tuple[int, str]:
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


def compute_intent(db: Session, lead_id) -> tuple[int, str]:
    weights: dict[str, int] = {
        "lead_created": 6,
        "email_open": 12,
        "email_click": 18,
        "page_visit": 8,
        "form_submit": 22,
        "reply": 35,
        "meeting_booked": 45,
        "webhook_received": 6,
        "rest_capture": 6,
        "outreach_sent": 4,
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
        w = weights.get(et, 4)
        add = min(int(c) * w, 80)
        total += add
        breakdown.append(f"{et.replace('_', ' ')} x{int(c)} (weight {w})")
    total = min(100, total)
    reason = (
        "Intent reflects weighted behavioral signals: "
        + ("; ".join(breakdown) if breakdown else "only baseline capture signals are present so far.")
    )
    return int(total), reason


def _predictive_reason(model: LogisticRegression, x: np.ndarray, proba: float) -> str:
    coef = model.coef_.ravel()
    contrib = coef * x.ravel()
    names = ["ICP-like fit", "observed engagement intent", "organizational scale signal"]
    ranked = sorted(zip(names, contrib), key=lambda t: abs(t[1]), reverse=True)
    bits = [f"{n} shifted log-odds by ~{c:+.2f}" for n, c in ranked]
    return (
        "Predictive estimate from a calibrated logistic model on synthetic historical structure: "
        + "; ".join(bits)
        + f". Estimated win probability is about {proba * 100:.0f}/100."
    )


def score_lead(db: Session, lead: Lead) -> Lead:
    fit, fit_reason = compute_fit(lead)
    intent, intent_reason = compute_intent(db, lead.id)

    m = _model()
    fit_n = fit / 100.0
    intent_n = intent / 100.0
    log_size = math.log1p(max(lead.company_size_estimate or 1, 1))
    x = np.array([[fit_n, intent_n, min(log_size / 15.0, 1.0)]])
    proba = float(m.predict_proba(x)[0][1])
    pred = int(round(max(0.0, min(1.0, proba)) * 100))
    pred_reason = _predictive_reason(m, x, proba)

    total = int(round(0.40 * fit + 0.35 * intent + 0.25 * pred))
    total = max(0, min(100, total))
    tier = "cold"
    if total >= settings.HOT_SCORE_MIN:
        tier = "hot"
    elif total >= settings.WARM_SCORE_MIN:
        tier = "warm"

    summary = (
        f"Lead scored {total}/100 ({tier.upper()}). Fit {fit}/100; intent {intent}/100; "
        f"predictive {pred}/100. Primary narrative: {fit_reason[:120]}"
    )

    lead.fit_score = fit
    lead.intent_score = intent
    lead.predictive_score = pred
    lead.total_score = total
    lead.tier = tier
    lead.fit_reason = fit_reason
    lead.intent_reason = intent_reason
    lead.predictive_reason = pred_reason
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
