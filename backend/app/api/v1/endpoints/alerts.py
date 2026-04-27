from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lead import Lead
from app.models.lead_alert import LeadAlert
from app.models.user import User
from app.schemas.alerts import LeadAlertOut, LeadAlertStatsItemOut
from app.services.alerts import avg_response_seconds_by_rep, run_escalation_pass
from app.services.audit import write_audit_log

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/active", response_model=list[LeadAlertOut], summary="Active alerts with elapsed time")
def active_alerts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LeadAlertOut]:
    run_escalation_pass(db)
    q = db.query(LeadAlert).filter(LeadAlert.responded_at.is_(None)).order_by(LeadAlert.triggered_at.asc())
    if user.role != "admin":
        q = q.filter(LeadAlert.assigned_to_id == user.id)
    rows = q.all()
    now = datetime.now(timezone.utc)
    out: list[LeadAlertOut] = []
    for row in rows:
        lead = db.get(Lead, row.lead_id)
        if lead is None:
            continue
        out.append(
            LeadAlertOut(
                id=row.id,
                lead_id=row.lead_id,
                lead_name=lead.name,
                assigned_to_id=row.assigned_to_id,
                triggered_at=row.triggered_at,
                responded_at=row.responded_at,
                escalated=row.escalated,
                trigger_reason=row.trigger_reason,
                elapsed_seconds=max(0, int((now - row.triggered_at).total_seconds())),
            )
        )
    return out


@router.post("/{alert_id}/respond", status_code=status.HTTP_204_NO_CONTENT, summary="Mark alert as responded")
def respond_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    row = db.get(LeadAlert, alert_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    if user.role != "admin" and row.assigned_to_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to respond to this alert")
    if row.responded_at is None:
        row.responded_at = datetime.now(timezone.utc)
        db.add(row)
        db.commit()
        write_audit_log(
            db,
            action="alert_respond",
            entity_type="lead_alert",
            entity_id=str(row.id),
            actor=user,
            metadata_json={"lead_id": str(row.lead_id)},
        )


@router.get("/stats", response_model=list[LeadAlertStatsItemOut], summary="Average alert response KPI")
def alert_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[LeadAlertStatsItemOut]:
    rows = avg_response_seconds_by_rep(db)
    return [
        LeadAlertStatsItemOut(
            user_id=user_id,
            user_name=user_name,
            avg_response_seconds=avg_seconds,
            responded_count=responded_count,
        )
        for user_id, user_name, avg_seconds, responded_count in rows
    ]
