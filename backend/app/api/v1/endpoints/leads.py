"""Lead capture, timeline, assignment, and retrieval."""

import hashlib
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_admin
from app.ml.scoring_engine import recompute_after_new_signal
from app.models.lead import Lead
from app.models.outreach_log import OutreachLog
from app.models.qr_badge import QRBadgeToken
from app.models.user import User
from app.schemas.lead import (
    LeadAssignIn,
    LeadCaptureIn,
    LeadDetailOut,
    LeadDuplicateOut,
    LeadEventIn,
    LeadEventOut,
    LeadListItem,
    LeadVerificationOut,
    OutreachOut,
)
from app.services import lead_capture as lead_capture_service
from app.services.async_pipeline import run_lead_pipeline_background
from app.services.tracking.timeline import list_timeline, log_event

router = APIRouter()


def _raise_duplicate(existing: Lead) -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=LeadDuplicateOut(
            reason="A lead with this email already exists.",
            existing_lead_id=existing.id,
            matched_on="email",
        ).model_dump(mode="json"),
    )


def _ensure_visible(user: User, lead: Lead) -> None:
    if user.role == "admin":
        return
    if lead.assigned_to_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")


@router.get("", response_model=list[LeadListItem], summary="List leads (RBAC scoped)")
def list_leads(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    tier: str | None = Query(default=None),
    tier_filter: str | None = Query(
        default=None,
        alias="filter",
        description="Dashboard shortcut: same as tier when tier is omitted (hot | warm | cold)",
    ),
    source: str | None = Query(default=None),
    min_score: int | None = Query(default=None, ge=0, le=100),
    max_score: int | None = Query(default=None, ge=0, le=100),
    created_from: datetime | None = Query(default=None),
    created_to: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
) -> list[LeadListItem]:
    eff_tier = tier
    if eff_tier is None and tier_filter:
        fl = tier_filter.strip().lower()
        if fl not in ("hot", "warm", "cold"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="filter must be one of: hot, warm, cold",
            )
        eff_tier = fl
    q = db.query(Lead)
    if user.role != "admin":
        q = q.filter(Lead.assigned_to_id == user.id)
    if eff_tier:
        q = q.filter(Lead.tier == eff_tier)
    if source:
        q = q.filter(Lead.source.ilike(f"%{source}%"))
    if min_score is not None:
        q = q.filter(Lead.total_score.is_not(None)).filter(Lead.total_score >= min_score)
    if max_score is not None:
        q = q.filter(Lead.total_score.is_not(None)).filter(Lead.total_score <= max_score)
    if created_from is not None:
        q = q.filter(Lead.created_at >= created_from)
    if created_to is not None:
        q = q.filter(Lead.created_at <= created_to)
    rows = q.order_by(Lead.created_at.desc()).limit(limit).all()
    return [LeadListItem.model_validate(x) for x in rows]


@router.post(
    "",
    response_model=LeadDetailOut,
    status_code=status.HTTP_201_CREATED,
    summary="Capture a new lead (REST entry point; authenticated operators)",
    responses={409: {"description": "Duplicate lead", "model": LeadDuplicateOut}},
)
def capture_lead(
    payload: LeadCaptureIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> LeadDetailOut:
    dup = lead_capture_service.find_duplicate_lead(db, payload)
    if dup is not None:
        _raise_duplicate(dup)
    try:
        lead = lead_capture_service.create_lead(db, payload, capture_channel="api", extras=None)
    except IntegrityError:
        db.rollback()
        dup = lead_capture_service.find_duplicate_lead(db, payload)
        if dup is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Lead could not be created due to a constraint conflict.",
            ) from None
        _raise_duplicate(dup)

    background_tasks.add_task(
        run_lead_pipeline_background,
        str(lead.id),
        "api",
        "rest_capture",
    )
    return LeadDetailOut.model_validate(lead)


@router.patch(
    "/{lead_id}/assign",
    response_model=LeadDetailOut,
    summary="Assign a lead to a sales rep (admin)",
)
def assign_lead(
    lead_id: UUID,
    body: LeadAssignIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> LeadDetailOut:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    if body.assigned_to_id is not None:
        target = db.get(User, body.assigned_to_id)
        if target is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignee not found")
    lead.assigned_to_id = body.assigned_to_id
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return LeadDetailOut.model_validate(lead)


@router.get(
    "/{lead_id}/outreach",
    response_model=list[OutreachOut],
    summary="Automated outreach history for a lead",
)
def list_lead_outreach(
    lead_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[OutreachOut]:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    _ensure_visible(user, lead)
    rows = (
        db.query(OutreachLog)
        .filter(OutreachLog.lead_id == lead_id)
        .order_by(OutreachLog.created_at.desc())
        .all()
    )
    return [OutreachOut.model_validate(r) for r in rows]


@router.get(
    "/{lead_id}/verification",
    response_model=LeadVerificationOut,
    summary="Verification artifacts (QR paths + integrity hash)",
)
def lead_verification_artifacts(
    lead_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadVerificationOut:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    _ensure_visible(user, lead)
    basis = f"{lead.id}:{lead.email}:{lead.created_at.isoformat()}".encode("utf-8")
    digest = hashlib.sha256(basis).hexdigest()
    badges = (
        db.query(QRBadgeToken)
        .filter(QRBadgeToken.lead_id == lead_id)
        .order_by(QRBadgeToken.created_at.desc())
        .all()
    )
    paths = [f"/api/v1/public/verify/qr/{b.token}" for b in badges]
    return LeadVerificationOut(profile_integrity_hash=digest[:40], qr_verify_paths=paths)


@router.get(
    "/{lead_id}/timeline",
    response_model=list[LeadEventOut],
    summary="Unified behavioral timeline",
)
def get_timeline(
    lead_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(default=200, ge=1, le=500),
) -> list[LeadEventOut]:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    _ensure_visible(user, lead)
    events = list_timeline(db, lead_id, limit=limit, ascending=True)
    return [LeadEventOut.model_validate(e) for e in events]


@router.post(
    "/{lead_id}/events",
    response_model=LeadDetailOut,
    summary="Append a behavioral signal and refresh scoring",
)
def append_lead_event(
    lead_id: UUID,
    body: LeadEventIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadDetailOut:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    _ensure_visible(user, lead)

    log_event(
        db,
        lead_id=lead.id,
        channel=body.channel,
        event_type=body.event_type,
        payload=body.payload,
        summary=body.summary,
    )
    updated = recompute_after_new_signal(db, lead.id)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return LeadDetailOut.model_validate(updated)


@router.get(
    "/{lead_id}",
    response_model=LeadDetailOut,
    summary="Fetch a single lead profile",
)
def get_lead(lead_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> LeadDetailOut:
    lead = lead_capture_service.get_lead_by_id(db, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    _ensure_visible(user, lead)
    return LeadDetailOut.model_validate(lead)
