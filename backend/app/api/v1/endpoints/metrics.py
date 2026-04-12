"""Dashboard metrics alias (same payload as analytics funnel)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.schemas.analytics import FunnelMetricsOut
from app.services.metrics_service import compute_funnel_metrics

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get(
    "",
    response_model=FunnelMetricsOut,
    summary="Org-wide KPI snapshot for dashboards",
    dependencies=[Depends(require_admin)],
)
def get_metrics(db: Session = Depends(get_db)) -> FunnelMetricsOut:
    return compute_funnel_metrics(db)
