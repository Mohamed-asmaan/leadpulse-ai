"""Shared inbound lead persistence for generic webhooks and Meta Lead Ads."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.schemas.lead import LeadCaptureIn, LeadDuplicateOut
from app.services import lead_capture as lead_capture_service
from app.services.capture_normalize import normalize_incoming_lead_dict


class LeadDuplicateError(Exception):
    """Email already exists — map to HTTP 409 in routers."""

    def __init__(self, existing_lead_id: UUID) -> None:
        self.existing_lead_id = existing_lead_id


def normalize_webhook_json(data: Any) -> tuple[LeadCaptureIn, dict[str, Any]]:
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")
    return normalize_incoming_lead_dict(data)


def persist_webhook_lead(
    db: Session,
    payload: LeadCaptureIn,
    *,
    extras: dict[str, Any] | None,
    capture_channel: str,
) -> Lead:
    dup = lead_capture_service.find_duplicate_lead(db, payload)
    if dup is not None:
        raise LeadDuplicateError(dup.id)
    try:
        return lead_capture_service.create_lead(
            db, payload, capture_channel=capture_channel, extras=extras or None
        )
    except IntegrityError:
        db.rollback()
        dup = lead_capture_service.find_duplicate_lead(db, payload)
        if dup is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Lead could not be created due to a constraint conflict.",
            ) from None
        raise LeadDuplicateError(dup.id) from None


def duplicate_http_exception(existing_id: UUID) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=LeadDuplicateOut(
            reason="A lead with this email already exists.",
            existing_lead_id=existing_id,
            matched_on="email",
        ).model_dump(mode="json"),
    )


def json_parse_error(_exc: json.JSONDecodeError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Body must be JSON",
    )


def normalize_error_http(exc: ValueError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"Invalid lead payload: {exc}",
    )
