"""Apply enrichment + standardization to a persisted Lead row."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.services.enrichment import providers
from app.services.standardize import standardize_country, standardize_industry


def enrich_lead_row(db: Session, lead: Lead) -> Lead:
    data = providers.enrich_profile(lead.email, lead.name, lead.company)
    lead.job_title = data.get("job_title")
    lead.industry = standardize_industry(data.get("industry"))
    lead.company_size_band = data.get("company_size_band")
    est = int(data.get("company_size_estimate") or 0)
    lead.company_size_estimate = est if est > 0 else None
    lead.location_country = standardize_country(data.get("location_country"))
    lead.enrichment_provider = str(data.get("provider") or "unknown")
    lead.enriched_at = datetime.now(timezone.utc)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead
