from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.models.lead_event import LeadEvent
from app.models.lead_score import LeadScore


@dataclass(frozen=True)
class ScoreRule:
    points: int
    reason: str
    aliases: tuple[str, ...]


POSITIVE_RULES: tuple[ScoreRule, ...] = (
    ScoreRule(10, "Email opened {count} time(s)", ("email_open", "opened_email")),
    ScoreRule(15, "Visited website {count} time(s)", ("website_visit", "page_view")),
    ScoreRule(25, "Visited pricing page {count} time(s)", ("pricing_visit", "pricing_page_visit")),
    ScoreRule(30, "Requested a demo {count} time(s)", ("demo_request", "requested_demo")),
    ScoreRule(20, "Submitted a form {count} time(s)", ("form_submission", "submitted_form")),
)

ACTIVITY_EVENT_TYPES: tuple[str, ...] = (
    "email_open",
    "opened_email",
    "website_visit",
    "page_view",
    "pricing_visit",
    "pricing_page_visit",
    "demo_request",
    "requested_demo",
    "form_submission",
    "submitted_form",
)


def _grade_for(score: int) -> str:
    if score >= 80:
        return "A"
    if score >= 60:
        return "B"
    if score >= 40:
        return "C"
    return "D"


def _event_count(db: Session, lead_id: UUID, event_types: tuple[str, ...]) -> int:
    return (
        db.query(func.count(LeadEvent.id))
        .filter(LeadEvent.lead_id == lead_id)
        .filter(LeadEvent.event_type.in_(event_types))
        .scalar()
        or 0
    )


def _last_activity(db: Session, lead_id: UUID) -> datetime | None:
    return (
        db.query(func.max(LeadEvent.occurred_at))
        .filter(LeadEvent.lead_id == lead_id)
        .filter(LeadEvent.event_type.in_(ACTIVITY_EVENT_TYPES))
        .scalar()
    )


def calculate_lead_score(db: Session, lead_id: UUID) -> LeadScore:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise ValueError("Lead not found")

    now = datetime.now(timezone.utc)
    score = 0
    reasons: list[str] = []

    for rule in POSITIVE_RULES:
        count = _event_count(db, lead_id, rule.aliases)
        if count > 0:
            score += rule.points * count
            reasons.append(rule.reason.format(count=count))

    last_activity = _last_activity(db, lead_id)
    inactive_days = None if last_activity is None else (now - last_activity).days

    if last_activity is None:
        reasons.append("No activity recorded yet")
    else:
        if inactive_days >= 7:
            score -= 10
            reasons.append("No activity in 7+ days")
        if inactive_days >= 14:
            score -= 20
            reasons.append("No activity in 14+ days")

    unsubscribed_count = _event_count(db, lead_id, ("unsubscribed", "email_unsubscribe"))
    if unsubscribed_count > 0:
        score -= 50
        reasons.append("Unsubscribed from outreach")

    score = max(0, min(100, score))
    is_dead = score < 10 or (last_activity is not None and last_activity <= now - timedelta(days=30))
    if is_dead and last_activity is not None and last_activity <= now - timedelta(days=30):
        reasons.append("No activity in 30+ days")
    if is_dead and score < 10:
        reasons.append("Score below 10")

    row = db.query(LeadScore).filter(LeadScore.lead_id == lead_id).one_or_none()
    if row is None:
        row = LeadScore(lead_id=lead_id)

    row.score = score
    row.grade = _grade_for(score)
    row.score_reasons = reasons
    row.last_calculated = now
    row.is_dead = is_dead

    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_last_activity_for_lead(db: Session, lead_id: UUID) -> datetime | None:
    return _last_activity(db, lead_id)
