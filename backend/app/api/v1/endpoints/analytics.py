from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.lead import Lead
from app.models.lead_event import LeadEvent
from app.schemas.analytics import FunnelMetricsOut

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/funnel",
    response_model=FunnelMetricsOut,
    dependencies=[Depends(require_admin)],
)
def funnel_metrics(db: Session = Depends(get_db)) -> FunnelMetricsOut:
    total = int(db.query(func.count(Lead.id)).scalar() or 0)
    hot = int(db.query(func.count(Lead.id)).filter(Lead.tier == "hot").scalar() or 0)
    warm = int(db.query(func.count(Lead.id)).filter(Lead.tier == "warm").scalar() or 0)
    cold = int(
        db.query(func.count(Lead.id))
        .filter(or_(Lead.tier == "cold", Lead.tier.is_(None)))
        .scalar()
        or 0
    )

    rows = (
        db.query(Lead.created_at, Lead.first_outreach_at)
        .filter(Lead.first_outreach_at.is_not(None))
        .all()
    )
    deltas: list[float] = []
    for created_at, first_out in rows:
        if created_at and first_out:
            deltas.append((first_out - created_at).total_seconds())
    avg_response = sum(deltas) / len(deltas) if deltas else None

    converted_raw = (
        db.query(func.count(func.distinct(LeadEvent.lead_id)))
        .filter(LeadEvent.event_type == "meeting_booked")
        .scalar()
    )
    converted = int(converted_raw or 0)
    conversion_rate = (converted / total) if total else None

    return FunnelMetricsOut(
        total_leads=total,
        hot=hot,
        warm=warm,
        cold=cold,
        avg_response_seconds=avg_response,
        conversion_proxy_rate=conversion_rate,
    )
