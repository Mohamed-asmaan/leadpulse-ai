from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.escalation_log import EscalationLog
from app.models.lead import Lead
from app.models.lead_alert import LeadAlert
from app.models.user import User
from app.services.tracking.timeline import log_event


def trigger_alert_for_lead(db: Session, lead: Lead, trigger_reason: str) -> LeadAlert | None:
    existing = (
        db.query(LeadAlert)
        .filter(LeadAlert.lead_id == lead.id)
        .filter(LeadAlert.responded_at.is_(None))
        .order_by(LeadAlert.triggered_at.desc())
        .first()
    )
    if existing is not None:
        return None

    row = LeadAlert(
        lead_id=lead.id,
        assigned_to_id=lead.assigned_to_id,
        trigger_reason=trigger_reason,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    log_event(
        db,
        lead_id=lead.id,
        channel="alerts",
        event_type="alert_triggered",
        payload={"alert_id": str(row.id), "reason": trigger_reason},
        summary=f"Lead alert triggered: {trigger_reason}",
    )
    return row


def maybe_trigger_alert_for_score_cross(db: Session, lead: Lead, previous_score: int | None) -> LeadAlert | None:
    prev = previous_score or 0
    curr = lead.total_score or 0
    if prev < 70 <= curr:
        return trigger_alert_for_lead(db, lead, "Score crossed 70")
    return None


def maybe_trigger_alert_for_pricing_visit(db: Session, lead: Lead, event_type: str) -> LeadAlert | None:
    if event_type not in {"pricing_visit", "pricing_page_visit"}:
        return None
    return trigger_alert_for_lead(db, lead, "Visited pricing page")


def _pick_manager_id(db: Session) -> UUID | None:
    manager = db.query(User).filter(User.role == "admin").order_by(User.created_at.asc()).first()
    return manager.id if manager is not None else None


def run_escalation_pass(db: Session) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
    rows = (
        db.query(LeadAlert)
        .filter(LeadAlert.responded_at.is_(None))
        .filter(LeadAlert.escalated.is_(False))
        .filter(LeadAlert.triggered_at <= cutoff)
        .all()
    )
    manager_id = _pick_manager_id(db)
    escalated = 0
    for alert in rows:
        alert.escalated = True
        db.add(alert)
        db.commit()
        db.refresh(alert)
        log = EscalationLog(
            alert_id=alert.id,
            lead_id=alert.lead_id,
            manager_user_id=manager_id,
            reason="No response within 5 minutes",
            note="Escalated by background check in active alerts flow.",
        )
        db.add(log)
        db.commit()
        lead = db.get(Lead, alert.lead_id)
        if lead is not None:
            log_event(
                db,
                lead_id=lead.id,
                channel="alerts",
                event_type="alert_escalated",
                payload={"alert_id": str(alert.id)},
                summary="Lead alert escalated after 5 minutes without response",
            )
        escalated += 1
    return escalated


def avg_response_seconds_by_rep(db: Session) -> list[tuple[UUID, str, float | None, int]]:
    rows = (
        db.query(
            User.id,
            User.full_name,
            func.avg(func.extract("epoch", LeadAlert.responded_at - LeadAlert.triggered_at)),
            func.count(LeadAlert.id),
        )
        .join(LeadAlert, LeadAlert.assigned_to_id == User.id)
        .filter(LeadAlert.responded_at.is_not(None))
        .group_by(User.id, User.full_name)
        .order_by(User.full_name.asc())
        .all()
    )
    out: list[tuple[UUID, str, float | None, int]] = []
    for user_id, name, avg_sec, count in rows:
        out.append((user_id, name, float(avg_sec) if avg_sec is not None else None, int(count)))
    return out
