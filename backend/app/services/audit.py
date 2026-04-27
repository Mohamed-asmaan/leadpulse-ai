from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.audit_log import AuditLog
from app.models.user import User


def write_audit_log(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: str,
    actor: User | None = None,
    outcome: str = "success",
    ip_address: str | None = None,
    metadata_json: dict[str, Any] | None = None,
    message: str | None = None,
) -> None:
    if not settings.ENABLE_AUDIT_LOGS:
        return
    row = AuditLog(
        actor_user_id=(actor.id if actor else None),
        actor_role=(actor.role if actor else None),
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        outcome=outcome,
        ip_address=ip_address,
        metadata_json=metadata_json,
        message=message,
    )
    db.add(row)
    db.commit()
