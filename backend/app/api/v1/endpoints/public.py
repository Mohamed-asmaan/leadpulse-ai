from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.lead import Lead
from app.models.qr_badge import QRBadgeToken
from app.schemas.verify import QRPayloadOut

router = APIRouter(prefix="/public", tags=["Public Verification"])


@router.get("/verify/qr/{token}", response_model=QRPayloadOut)
def verify_qr(token: str, db: Session = Depends(get_db)) -> QRPayloadOut:
    badge = db.query(QRBadgeToken).filter(QRBadgeToken.token == token).one_or_none()
    if badge is None:
        return QRPayloadOut(valid=False)
    lead = db.get(Lead, badge.lead_id)
    if lead is None:
        return QRPayloadOut(valid=False)
    return QRPayloadOut(
        valid=True,
        badge_type=badge.badge_type,
        tier=lead.tier,
        issued_at=badge.created_at.isoformat(),
    )
