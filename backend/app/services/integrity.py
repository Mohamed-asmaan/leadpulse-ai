"""Score integrity: weighted total 40% fit / 30% intent / 30% engagement + tier thresholds."""

from __future__ import annotations

import logging

from app.core.config import settings
from app.models.lead import Lead

logger = logging.getLogger(__name__)


def weighted_total(fit: int, intent: int, engagement: int) -> int:
    v = int(round(0.40 * fit + 0.30 * intent + 0.30 * engagement))
    return max(0, min(100, v))


def tier_for_score(total: int) -> str:
    if total >= settings.HOT_SCORE_MIN:
        return "hot"
    if total >= settings.WARM_SCORE_MIN:
        return "warm"
    return "cold"


def reconcile_lead_scores(lead: Lead) -> list[str]:
    """Recompute aggregate from components and align tier labels."""
    notes: list[str] = []
    if lead.fit_score is None or lead.intent_score is None or lead.predictive_score is None:
        return ["Incomplete score components; skipping reconciliation."]

    expected = weighted_total(lead.fit_score, lead.intent_score, lead.predictive_score)
    if lead.total_score is not None and abs(lead.total_score - expected) > 1:
        notes.append(f"Reconciled total_score from {lead.total_score} to {expected} (weighted sum).")
        lead.total_score = expected

    correct_tier = tier_for_score(lead.total_score or 0)
    if lead.tier and lead.tier != correct_tier:
        notes.append(f"Reconciled tier from '{lead.tier}' to '{correct_tier}' based on thresholds.")
        lead.tier = correct_tier
    elif lead.tier is None:
        lead.tier = correct_tier

    if notes:
        logger.info("Score integrity adjustments for lead %s: %s", lead.id, "; ".join(notes))
    return notes
