from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.dead_lead_log import DeadLeadLog
from app.models.lead import Lead
from app.models.lead_event import LeadEvent
from app.models.lead_score import LeadScore
from app.services.scoring import calculate_lead_score, get_last_activity_for_lead


def _latest_stage_change_or_created(db: Session, lead: Lead) -> datetime:
    stage_change = (
        db.query(func.max(LeadEvent.occurred_at))
        .filter(LeadEvent.lead_id == lead.id)
        .filter(LeadEvent.event_type.in_(("stage_changed", "pipeline_stage_changed")))
        .scalar()
    )
    return stage_change or lead.created_at


def dead_reason_for_lead(db: Session, lead: Lead, score_row: LeadScore) -> str | None:
    if score_row.score < 10:
        return "Score below 10"

    last_activity = get_last_activity_for_lead(db, lead.id)
    if last_activity is None or last_activity <= datetime.now(timezone.utc) - timedelta(days=30):
        return "No activity in 30+ days"

    stage_anchor = _latest_stage_change_or_created(db, lead)
    if stage_anchor <= datetime.now(timezone.utc) - timedelta(days=45):
        return "No pipeline stage movement in 45+ days"

    return None


def mark_dead_with_log(db: Session, lead: Lead, score_row: LeadScore, reason: str) -> DeadLeadLog:
    score_row.is_dead = True
    if reason not in (score_row.score_reasons or []):
        score_row.score_reasons = [*(score_row.score_reasons or []), reason]
    db.add(score_row)
    db.commit()
    db.refresh(score_row)

    log = DeadLeadLog(
        lead_id=lead.id,
        reason=reason,
        note=f"Archived by dead lead detector at score={score_row.score}, grade={score_row.grade}",
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def detect_dead_leads(db: Session) -> int:
    leads = db.query(Lead).all()
    marked = 0
    for lead in leads:
        score_row = calculate_lead_score(db, lead.id)
        reason = dead_reason_for_lead(db, lead, score_row)
        if reason is None or score_row.is_dead:
            continue
        mark_dead_with_log(db, lead, score_row, reason)
        marked += 1
    return marked


def revive_lead(db: Session, lead_id: UUID) -> LeadScore | None:
    score_row = db.query(LeadScore).filter(LeadScore.lead_id == lead_id).one_or_none()
    if score_row is None:
        return None
    score_row.score = 30
    score_row.grade = "D"
    score_row.is_dead = False
    score_row.score_reasons = ["Manually revived and score reset to 30"]
    score_row.last_calculated = datetime.now(timezone.utc)
    db.add(score_row)
    db.commit()
    db.refresh(score_row)

    open_log = (
        db.query(DeadLeadLog)
        .filter(DeadLeadLog.lead_id == lead_id)
        .filter(DeadLeadLog.revived_at.is_(None))
        .order_by(DeadLeadLog.marked_dead_at.desc())
        .first()
    )
    if open_log is not None:
        open_log.revived_at = datetime.now(timezone.utc)
        db.add(open_log)
        db.commit()
    return score_row
