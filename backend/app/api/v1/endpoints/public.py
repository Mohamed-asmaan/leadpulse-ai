from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.lead import Lead
from app.models.qr_badge import QRBadgeToken
from app.schemas.verify import QRPayloadOut

router = APIRouter(prefix="/public", tags=["Public Verification"])


def _contact_initial(lead: Lead) -> str:
    parts = (lead.name or "").strip().split()
    initial = (parts[0][0] + ".").upper() if parts and parts[0] else "?"
    co = (lead.company or "unknown org").strip()
    return f"{initial} @ {co[:48]}"


@router.get("/verify/qr/{token}", response_model=QRPayloadOut)
def verify_qr(token: str, db: Session = Depends(get_db)) -> QRPayloadOut:
    badge = db.query(QRBadgeToken).filter(QRBadgeToken.token == token).one_or_none()
    if badge is None:
        return QRPayloadOut(
            valid=False,
            verification_message="This verification link is not recognized (unknown or expired token).",
        )
    lead = db.get(Lead, badge.lead_id)
    if lead is None:
        return QRPayloadOut(valid=False, verification_message="Lead record is no longer available.")
    return QRPayloadOut(
        valid=True,
        badge_type=badge.badge_type,
        tier=lead.tier,
        issued_at=badge.created_at.isoformat(),
        total_score=lead.total_score,
        industry=lead.industry,
        contact_initial=_contact_initial(lead),
        verification_message="Credential verified: LeadPulse issued HOT-tier badge for this contact.",
    )
