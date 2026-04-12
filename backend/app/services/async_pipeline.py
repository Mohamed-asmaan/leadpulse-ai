"""Background execution of the lead pipeline (separate DB session per task)."""

from __future__ import annotations

import logging
from uuid import UUID

from app.core.database import SessionLocal
from app.services.pipeline import process_lead_pipeline

logger = logging.getLogger(__name__)


def run_lead_pipeline_background(lead_id_str: str, ingest_channel: str, ingest_event_type: str) -> None:
    """FastAPI BackgroundTasks entrypoint: must not reuse request-scoped Session."""
    db = SessionLocal()
    try:
        process_lead_pipeline(db, UUID(lead_id_str), ingest_channel=ingest_channel, ingest_event_type=ingest_event_type)
    except Exception:
        logger.exception("Lead pipeline failed for %s", lead_id_str)
    finally:
        db.close()
