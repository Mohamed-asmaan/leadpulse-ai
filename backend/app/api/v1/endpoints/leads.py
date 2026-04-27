"""Lead capture, timeline, assignment, and retrieval."""

import hashlib
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_admin
from app.ml.scoring_engine import recompute_after_new_signal
from app.models.lead import Lead
from app.models.lead_score import LeadScore
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
    LeadPriorityItemOut,
    LeadVerificationOut,
    OutreachOut,
)
from app.schemas.dead_lead import DeadLeadItemOut, DeadLeadSummaryOut
from app.models.dead_lead_log import DeadLeadLog
from app.services.alerts import maybe_trigger_alert_for_pricing_visit, maybe_trigger_alert_for_score_cross
from app.services.dead_leads import dead_reason_for_lead, detect_dead_leads, mark_dead_with_log, revive_lead
from app.services import lead_capture as lead_capture_service
from app.services.async_pipeline import run_lead_pipeline_background
from app.services.scoring import calculate_lead_score, get_last_activity_for_lead
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


@router.get(
    "/priority-list",
    response_model=list[LeadPriorityItemOut],
    summary="List leads sorted by score (dead leads optional)",
)
def priority_list(
    include_dead: bool = Query(default=False, description="Include leads marked as dead"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LeadPriorityItemOut]:
    q = db.query(Lead)
    if user.role != "admin":
        q = q.filter(Lead.assigned_to_id == user.id)
    leads = q.order_by(Lead.created_at.desc()).all()

    items: list[LeadPriorityItemOut] = []
    for lead in leads:
        score_row = calculate_lead_score(db, lead.id)
        if score_row.is_dead and not include_dead:
            continue
        items.append(
            LeadPriorityItemOut(
                lead_id=lead.id,
                name=lead.name,
                score=score_row.score,
                grade=score_row.grade,
                score_reasons=score_row.score_reasons or [],
                last_calculated=score_row.last_calculated,
                last_activity=get_last_activity_for_lead(db, lead.id),
                is_dead=score_row.is_dead,
            )
        )
    return sorted(items, key=lambda x: x.score, reverse=True)


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

    previous_score = lead.total_score
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
    maybe_trigger_alert_for_pricing_visit(db, updated, body.event_type)
    maybe_trigger_alert_for_score_cross(db, updated, previous_score)
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


@router.get("/dead", response_model=list[DeadLeadItemOut], summary="List dead leads with archive reasons")
def list_dead_leads(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[DeadLeadItemOut]:
    q = db.query(Lead).join(LeadScore, LeadScore.lead_id == Lead.id).filter(LeadScore.is_dead.is_(True))
    if user.role != "admin":
        q = q.filter(Lead.assigned_to_id == user.id)
    leads = q.order_by(LeadScore.last_calculated.desc()).all()
    out: list[DeadLeadItemOut] = []
    for lead in leads:
        score = db.query(LeadScore).filter(LeadScore.lead_id == lead.id).one_or_none()
        if score is None:
            continue
        log = (
            db.query(DeadLeadLog)
            .filter(DeadLeadLog.lead_id == lead.id)
            .order_by(DeadLeadLog.marked_dead_at.desc())
            .first()
        )
        out.append(
            DeadLeadItemOut(
                lead_id=lead.id,
                lead_name=lead.name,
                score=score.score,
                grade=score.grade,
                reason=(log.reason if log is not None else "Marked dead by scoring rules"),
                marked_dead_at=(log.marked_dead_at if log is not None else score.last_calculated),
                revived_at=(log.revived_at if log is not None else None),
            )
        )
    return out


@router.post("/{lead_id}/revive", response_model=LeadPriorityItemOut, summary="Revive a dead lead")
def revive_dead_lead(
    lead_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> LeadPriorityItemOut:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    score_row = revive_lead(db, lead_id)
    if score_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead score not found")
    return LeadPriorityItemOut(
        lead_id=lead.id,
        name=lead.name,
        score=score_row.score,
        grade=score_row.grade,
        score_reasons=score_row.score_reasons or [],
        last_calculated=score_row.last_calculated,
        last_activity=get_last_activity_for_lead(db, lead.id),
        is_dead=score_row.is_dead,
    )


@router.post("/dead/archive-all", response_model=DeadLeadSummaryOut, summary="Detect and archive all dead leads")
def archive_all_dead_leads(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> DeadLeadSummaryOut:
    # Ensure score rows exist and include stage-stale criteria.
    _ = detect_dead_leads(db)
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    archived_this_month = (
        db.query(DeadLeadLog).filter(DeadLeadLog.marked_dead_at >= month_start).count()
    )
    return DeadLeadSummaryOut(
        archived_this_month=archived_this_month,
        estimated_hours_saved=archived_this_month * 2,
    )


@router.get("/dead/summary", response_model=DeadLeadSummaryOut, summary="Dead lead archive summary")
def dead_lead_summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DeadLeadSummaryOut:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    archived_this_month = (
        db.query(DeadLeadLog).filter(DeadLeadLog.marked_dead_at >= month_start).count()
    )
    return DeadLeadSummaryOut(
        archived_this_month=archived_this_month,
        estimated_hours_saved=archived_this_month * 2,
    )
