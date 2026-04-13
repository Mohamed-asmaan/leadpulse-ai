"""Public website lead capture + embeddable script (end-to-end with the pipeline)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, Response, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.schemas.lead import LeadCaptureIn
from app.schemas.website import WebsiteLeadIn, WebsiteLeadOut
from app.services.async_pipeline import run_lead_pipeline_background
from app.services.webhook_ingest import LeadDuplicateError, duplicate_http_exception, persist_webhook_lead

router = APIRouter(prefix="/public", tags=["Website forms"])


def _embed_js(api_origin: str) -> str:
    """Minimal no-dependency embed: intercept forms marked with data-leadpulse-website-lead."""
    api = api_origin.rstrip("/")
    return f"""(function(){{
  var scr = document.currentScript;
  var api = (scr.getAttribute('data-api') || '{api}').replace(/\\/$/, '');
  var secret = scr.getAttribute('data-secret') || '';
  if (!secret) {{ console.warn('LeadPulse: add data-secret to the script tag'); return; }}
  document.addEventListener('submit', function(ev) {{
    var form = ev.target && ev.target.closest && ev.target.closest('form[data-leadpulse-website-lead]');
    if (!form) return;
    ev.preventDefault();
    var fd = new FormData(form);
    var body = {{
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim().toLowerCase(),
      phone: (fd.get('phone') && String(fd.get('phone')).trim()) || null,
      company: (fd.get('company') && String(fd.get('company')).trim()) || null,
      source: String(fd.get('source') || 'website').trim() || 'website',
      landing_page: String(fd.get('landing_page') || window.location.href).slice(0, 2048)
    }};
    fetch(api + '/api/v1/public/website-lead', {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json', 'X-Website-Form-Secret': secret }},
      body: JSON.stringify(body)
    }}).then(function(r) {{
      if (r.ok) {{
        var done = form.getAttribute('data-success-message') || 'Thank you — we will be in touch shortly.';
        while (form.firstChild) {{ form.removeChild(form.firstChild); }}
        var p = document.createElement('p');
        p.className = 'leadpulse-form-thanks';
        p.textContent = done;
        form.appendChild(p);
      }} else {{
        r.text().then(function(t) {{ alert('Could not submit: ' + t); }});
      }}
    }}).catch(function() {{ alert('Network error'); }});
  }});
}})();
"""


@router.get(
    "/embed/lead-form.js",
    summary="Embeddable script for marketing sites (set data-api, data-secret on script tag)",
    response_class=Response,
)
def website_lead_embed_script(request: Request) -> Response:
    base = str(request.base_url).rstrip("/")
    return Response(content=_embed_js(base), media_type="application/javascript; charset=utf-8")


@router.post(
    "/website-lead",
    response_model=WebsiteLeadOut,
    status_code=status.HTTP_201_CREATED,
    summary="Capture a lead from a public website form (requires X-Website-Form-Secret when configured)",
)
def public_website_lead(
    body: WebsiteLeadIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_website_form_secret: str | None = Header(default=None, alias="X-Website-Form-Secret"),
) -> WebsiteLeadOut:
    expected = (settings.WEBSITE_FORM_SHARED_SECRET or "").strip()
    if expected and (x_website_form_secret or "") != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid website form secret")

    ctx: dict[str, Any] = {}
    if body.landing_page:
        ctx["landing_page"] = body.landing_page
    phone = (body.phone or "").strip() or None
    base = {
        "name": body.name.strip(),
        "email": body.email,
        "company": (body.company or "").strip() or None,
        "source": body.source.strip(),
        "context": ctx or None,
    }
    if phone:
        base["phone"] = phone
    try:
        payload = LeadCaptureIn.model_validate(base)
    except ValidationError:
        base.pop("phone", None)
        payload = LeadCaptureIn.model_validate(base)
    try:
        lead = persist_webhook_lead(db, payload, extras={"website_form": True}, capture_channel="website")
    except LeadDuplicateError as dup:
        raise duplicate_http_exception(dup.existing_lead_id) from dup

    background_tasks.add_task(
        run_lead_pipeline_background,
        str(lead.id),
        "website",
        "website_form",
    )
    return WebsiteLeadOut(lead_id=lead.id)
