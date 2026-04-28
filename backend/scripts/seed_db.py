import argparse
import hashlib
import json
import random
import secrets
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from faker import Faker

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    AuditLog,
    DeadLeadLog,
    EscalationLog,
    Lead,
    LeadAlert,
    LeadEvent,
    LeadScore,
    OutreachLog,
    QRBadgeToken,
    User,
    WebhookReceipt,
)

faker = Faker()
Faker.seed(77)
random.seed(77)

SOURCE_POOL = ["website_form", "webhook", "api", "linkedin", "referral", "event"]
CAPTURE_CHANNEL_POOL = ["manual", "api", "webhook"]
EVENT_TYPE_POOL = [
    "lead_created",
    "page_view",
    "email_open",
    "email_click",
    "form_submit",
    "webhook_received",
    "demo_requested",
    "pricing_viewed",
    "doc_downloaded",
    "call_scheduled",
]
EVENT_CHANNEL_POOL = ["web", "email", "webhook", "api", "phone"]
OUTREACH_CHANNEL_POOL = ["email", "sms", "call"]
OUTREACH_STATUS_POOL = ["sent", "delivered", "opened", "bounced", "replied"]
OUTREACH_SUBJECTS = [
    "Following up on your demo request",
    "Quick intro: LeadPulse",
    "Can we help qualify your pipeline this week?",
    "Next step for your inbound workflow",
    "LeadPulse workflow review",
]
INDUSTRY_POOL = ["SaaS", "FinTech", "HealthTech", "EdTech", "Retail", "Logistics", "Cybersecurity", "Real Estate"]
COUNTRY_POOL = ["US", "IN", "GB", "DE", "SG", "AE", "CA", "AU"]
COMPANY_SIZE_BAND_POOL = ["1-10", "11-50", "51-200", "201-500", "500+"]
ALERT_REASON_POOL = ["high_score_no_contact", "sla_breach_5min", "demo_requested_unassigned"]
DEAD_REASON_POOL = ["no_engagement_30_days", "bounced_email", "competitor_chosen", "budget_freeze"]
AUDIT_ACTION_POOL = [
    "lead_created",
    "lead_updated",
    "lead_scored",
    "lead_enriched",
    "outreach_sent",
    "lead_marked_dead",
    "lead_revived",
    "user_login",
    "user_created",
    "alert_triggered",
    "escalation_created",
    "webhook_received",
    "qr_token_generated",
    "lead_assigned",
]


def now_utc() -> datetime:
    return datetime.now(UTC)


def model_fields(model_cls) -> set[str]:
    return {col.key for col in model_cls.__mapper__.columns}


def filter_model_kwargs(model_cls, payload: dict[str, Any]) -> dict[str, Any]:
    allowed = model_fields(model_cls)
    return {k: v for k, v in payload.items() if k in allowed}


def random_between(start: datetime, end: datetime) -> datetime:
    if end <= start:
        return start
    span = int((end - start).total_seconds())
    return start + timedelta(seconds=random.randint(0, span))


def normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    return digits[:32]


def payload_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def make_capture_payload() -> dict[str, Any]:
    return {
        "utm_source": random.choice(["google", "linkedin", "newsletter", "youtube", "direct"]),
        "utm_campaign": random.choice(["q2_outbound", "enterprise_push", "demo_drive", "retargeting"]),
        "page": random.choice(["/pricing", "/demo", "/features", "/compare", "/case-studies"]),
        "referrer": random.choice(["https://google.com", "https://linkedin.com", "https://bing.com"]),
        "session_id": str(uuid.uuid4()),
    }


def tier_scores(tier: str) -> tuple[int, int, int, int]:
    if tier == "hot":
        return (
            random.randint(75, 95),
            random.randint(70, 95),
            random.randint(75, 95),
            random.randint(80, 99),
        )
    if tier == "warm":
        return (
            random.randint(50, 79),
            random.randint(45, 79),
            random.randint(45, 79),
            random.randint(50, 79),
        )
    if tier == "cold":
        return (
            random.randint(20, 49),
            random.randint(20, 49),
            random.randint(20, 49),
            random.randint(20, 49),
        )
    return (
        random.randint(5, 25),
        random.randint(5, 25),
        random.randint(5, 25),
        random.randint(5, 19),
    )


def grade_for_tier(tier: str) -> str:
    return {"hot": "A", "warm": "B", "cold": "C", "dead": "D"}[tier]


def event_payload(event_type: str) -> dict[str, Any]:
    if event_type == "lead_created":
        return {"created_via": random.choice(["manual", "api", "webhook"])}
    if event_type == "page_view":
        return {"page": random.choice(["/pricing", "/features", "/docs"]), "duration_seconds": random.randint(20, 420)}
    if event_type == "email_open":
        return {"campaign": random.choice(["intro", "follow_up", "webinar"]), "device": random.choice(["mobile", "desktop"])}
    if event_type == "email_click":
        return {"link": random.choice(["/book-demo", "/pricing", "/security"]), "campaign": random.choice(["intro", "follow_up"])}
    if event_type == "form_submit":
        return {"form_name": random.choice(["demo_request", "contact_us"]), "fields_completed": random.randint(4, 9)}
    if event_type == "webhook_received":
        return {"provider": random.choice(["zapier", "hubspot", "make"]), "status": "accepted"}
    if event_type == "demo_requested":
        return {"preferred_slot": faker.iso8601(), "team_size": random.choice([5, 12, 35, 80, 200])}
    if event_type == "pricing_viewed":
        return {"plan": random.choice(["starter", "growth", "enterprise"]), "revisited": random.choice([True, False])}
    if event_type == "doc_downloaded":
        return {"asset": random.choice(["roi-guide.pdf", "security-paper.pdf", "playbook.pdf"])}
    if event_type == "call_scheduled":
        return {"duration_minutes": random.choice([15, 30, 45]), "platform": random.choice(["meet", "zoom"])}
    return {"note": "generic signal"}


def reset_all(db) -> None:
    print("Resetting tables")
    db.query(QRBadgeToken).delete()
    db.query(WebhookReceipt).delete()
    db.query(AuditLog).delete()
    db.query(DeadLeadLog).delete()
    db.query(EscalationLog).delete()
    db.query(LeadAlert).delete()
    db.query(OutreachLog).delete()
    db.query(LeadEvent).delete()
    db.query(LeadScore).delete()
    db.query(Lead).delete()
    db.query(User).delete()
    db.commit()


def seed(reset: bool = False) -> None:
    db = SessionLocal()
    counts: dict[str, int] = {
        "users": 0,
        "leads": 0,
        "events": 0,
        "outreach": 0,
        "alerts": 0,
        "escalations": 0,
        "dead_logs": 0,
        "audits": 0,
        "receipts": 0,
        "tokens": 0,
    }

    try:
        if reset:
            reset_all(db)

        print("Seeding users")
        user_seed = [
            ("admin@leadpulse.io", "LeadPulse Admin", "Admin1234!", "admin"),
            ("manager1@leadpulse.io", "Manager One", "Manager1234!", "manager"),
            ("manager2@leadpulse.io", "Manager Two", "Manager1234!", "manager"),
            ("sales1@leadpulse.io", "Sales Rep One", "Sales1234!", "sales"),
            ("sales2@leadpulse.io", "Sales Rep Two", "Sales1234!", "sales"),
            ("sales3@leadpulse.io", "Sales Rep Three", "Sales1234!", "sales"),
        ]
        users: list[User] = []
        for email, full_name, password, role in user_seed:
            payload = {
                "id": uuid.uuid4(),
                "email": email,
                "full_name": full_name,
                "hashed_password": hash_password(password),
                "role": role,
                "is_active": True,
                "created_at": now_utc() - timedelta(days=random.randint(5, 200)),
                "updated_at": now_utc(),
            }
            users.append(User(**filter_model_kwargs(User, payload)))
        db.add_all(users)
        db.commit()
        counts["users"] = len(users)

        managers = [u for u in users if u.role == "manager"]
        sales = [u for u in users if u.role == "sales"]
        low_activity_sales = sales[-1]

        print("Seeding leads")
        tiers = ["hot"] * 8 + ["warm"] * 10 + ["cold"] * 8 + ["dead"] * 4
        random.shuffle(tiers)
        sources = SOURCE_POOL * 5
        channels = CAPTURE_CHANNEL_POOL * 10
        random.shuffle(sources)
        random.shuffle(channels)

        leads: list[Lead] = []
        ninety_days_ago = now_utc() - timedelta(days=90)
        for i in range(30):
            tier = tiers[i]
            fit, intent, predictive, total = tier_scores(tier)
            created_at = random_between(ninety_days_ago, now_utc() - timedelta(days=1))
            scored_at = created_at + timedelta(hours=random.randint(1, 120))
            enriched_at = created_at + timedelta(hours=random.randint(1, 48))
            raw_payload = make_capture_payload()

            name = faker.name()
            email_local = name.lower().replace(" ", ".").replace("'", "")
            email = f"{email_local}.{i+1}@{faker.free_email_domain()}"
            phone = faker.phone_number()
            assigned_user = low_activity_sales if i == 0 else random.choice(sales)

            payload = {
                "id": uuid.uuid4(),
                "name": name,
                "email": email,
                "phone": phone,
                "phone_normalized": normalize_phone(phone),
                "company": faker.company(),
                "source": sources[i],
                "capture_channel": channels[i],
                "raw_capture_payload": raw_payload,
                "integrity_sha256": payload_hash(raw_payload),
                "assigned_to_id": assigned_user.id,
                "job_title": faker.job(),
                "industry": random.choice(INDUSTRY_POOL),
                "company_size_band": random.choice(COMPANY_SIZE_BAND_POOL),
                "company_size_estimate": random.choice([8, 15, 35, 75, 120, 300, 800, 1500]),
                "company_size": random.choice(COMPANY_SIZE_BAND_POOL),
                "location_country": random.choice(COUNTRY_POOL),
                "country": random.choice(COUNTRY_POOL),
                "enrichment_provider": "clearbit",
                "enriched_at": enriched_at,
                "fit_score": fit,
                "intent_score": intent,
                "predictive_score": predictive,
                "total_score": total,
                "tier": tier,
                "fit_reason": f"Strong ICP match: {random.choice(['Series A SaaS', 'Series B SaaS', 'mid-market platform'])} with team size alignment.",
                "intent_reason": f"High intent: visited pricing page {random.randint(2, 6)}x and requested comparison material.",
                "predictive_reason": f"Behavior signal: {random.choice(['multi-touch engagement', 'steady email interaction', 'recent demo intent'])}.",
                "score_summary": f"{tier.upper()} priority lead with blended score {total}.",
                "score_reasons": "Generated from fit, intent, and behavioral model.",
                "scored_at": scored_at,
                "is_dead": tier == "dead",
                "notes": f"Seeded from {sources[i]} for E2E testing.",
                "created_at": created_at,
                "updated_at": max(created_at, scored_at),
            }
            lead = Lead(**filter_model_kwargs(Lead, payload))
            leads.append(lead)
            print(f"  Created lead: {lead.email} [{tier}]")

        no_enrichment_lead = leads[1]
        for field in ["job_title", "industry", "company_size_band", "company_size_estimate", "location_country", "enrichment_provider", "enriched_at", "company_size", "country"]:
            if hasattr(no_enrichment_lead, field):
                setattr(no_enrichment_lead, field, None)

        no_outreach_lead = leads[2]

        db.add_all(leads)
        db.commit()
        counts["leads"] = len(leads)

        print("Seeding lead_scores")
        lead_scores: list[LeadScore] = []
        for lead in leads:
            reasons_json = [
                {"factor": "fit", "weight": 0.4, "value": int(lead.fit_score or 0), "note": "ICP match"},
                {"factor": "intent", "weight": 0.3, "value": int(lead.intent_score or 0), "note": "Intent intensity"},
                {"factor": "predictive", "weight": 0.3, "value": int(lead.predictive_score or 0), "note": "Behavioral probability"},
            ]
            payload = {
                "id": uuid.uuid4(),
                "lead_id": lead.id,
                "score": int(lead.total_score or 0),
                "grade": grade_for_tier((lead.tier or "dead")),
                "score_reasons": reasons_json,
                "is_dead": (lead.tier == "dead"),
                "is_dead_flagged": (lead.tier == "dead"),
                "last_calculated": lead.scored_at or now_utc(),
                "calculated_at": lead.scored_at or now_utc(),
                "created_at": lead.created_at,
                "updated_at": lead.updated_at if hasattr(lead, "updated_at") else now_utc(),
            }
            lead_scores.append(LeadScore(**filter_model_kwargs(LeadScore, payload)))
        db.add_all(lead_scores)

        print("Seeding lead_events")
        events: list[LeadEvent] = []
        sixty_days_ago = now_utc() - timedelta(days=60)
        for lead in leads:
            count = random.randint(3, 8)
            first_time = max(lead.created_at, sixty_days_ago)
            events.append(
                LeadEvent(
                    **filter_model_kwargs(
                        LeadEvent,
                        {
                            "id": uuid.uuid4(),
                            "lead_id": lead.id,
                            "event_type": "lead_created",
                            "channel": "api",
                            "payload": {"source": lead.source, "capture_channel": lead.capture_channel},
                            "summary": "Lead created",
                            "occurred_at": first_time,
                            "created_at": first_time,
                        },
                    )
                )
            )
            cursor = first_time + timedelta(minutes=3)
            for _ in range(count - 1):
                event_type = random.choice(EVENT_TYPE_POOL[1:])
                occurred = random_between(cursor, now_utc())
                cursor = occurred + timedelta(minutes=2)
                events.append(
                    LeadEvent(
                        **filter_model_kwargs(
                            LeadEvent,
                            {
                                "id": uuid.uuid4(),
                                "lead_id": lead.id,
                                "event_type": event_type,
                                "channel": random.choice(EVENT_CHANNEL_POOL),
                                "payload": event_payload(event_type),
                                "summary": f"{event_type.replace('_', ' ').title()} captured",
                                "occurred_at": occurred,
                                "created_at": occurred,
                            },
                        )
                    )
                )
        db.add_all(events)
        counts["events"] = len(events)

        print("Seeding outreach_logs")
        outreach: list[OutreachLog] = []
        for lead in leads:
            if lead.id == no_outreach_lead.id:
                continue
            for _ in range(random.randint(2, 5)):
                sent_at = random_between(lead.created_at + timedelta(hours=1), now_utc())
                payload = {
                    "id": uuid.uuid4(),
                    "lead_id": lead.id,
                    "channel": random.choice(OUTREACH_CHANNEL_POOL),
                    "subject": random.choice(OUTREACH_SUBJECTS),
                    "message": (
                        f"Hi {lead.name.split()[0]}, thanks for checking LeadPulse. "
                        "We can help your team prioritize inbound leads quickly. "
                        "Are you open to a short walkthrough this week?"
                    ),
                    "status": random.choice(OUTREACH_STATUS_POOL),
                    "created_at": sent_at,
                    "sent_at": sent_at,
                }
                outreach.append(OutreachLog(**filter_model_kwargs(OutreachLog, payload)))
        db.add_all(outreach)
        counts["outreach"] = len(outreach)

        print("Seeding lead_alerts")
        hot_leads = [lead for lead in leads if lead.tier == "hot"]
        warm_leads = [lead for lead in leads if lead.tier == "warm"]
        alert_targets = hot_leads + random.sample(warm_leads, k=min(7, len(warm_leads)))
        alert_targets = alert_targets[:15]
        alerts: list[LeadAlert] = []
        for i, lead in enumerate(alert_targets):
            triggered = now_utc() - timedelta(days=random.randint(0, 25), hours=random.randint(0, 20))
            responded = None if i < 4 else triggered + timedelta(minutes=random.randint(5, 360))
            payload = {
                "id": uuid.uuid4(),
                "lead_id": lead.id,
                "assigned_to_id": lead.assigned_to_id,
                "trigger_reason": random.choice(ALERT_REASON_POOL),
                "triggered_at": triggered,
                "responded_at": responded,
                "escalated": i < 3,
                "is_escalated": i < 3,
                "created_at": triggered,
                "updated_at": responded or triggered,
            }
            alerts.append(LeadAlert(**filter_model_kwargs(LeadAlert, payload)))
        db.add_all(alerts)
        db.flush()
        counts["alerts"] = len(alerts)

        print("Seeding escalation_logs")
        escalations: list[EscalationLog] = []
        escalated_alerts = [a for a in alerts if bool(getattr(a, "escalated", False) or getattr(a, "is_escalated", False))]
        for i, alert in enumerate(escalated_alerts[:3]):
            payload = {
                "id": uuid.uuid4(),
                "alert_id": alert.id,
                "lead_id": alert.lead_id,
                "manager_user_id": managers[i % len(managers)].id,
                "manager_id": managers[i % len(managers)].id,
                "reason": random.choice(["no_sales_response", "repeated_sla_breach"]),
                "note": "Lead requested demo twice. No follow-up from assigned rep in 48h.",
                "created_at": alert.triggered_at + timedelta(hours=1),
            }
            escalations.append(EscalationLog(**filter_model_kwargs(EscalationLog, payload)))
        db.add_all(escalations)
        counts["escalations"] = len(escalations)

        print("Seeding dead_lead_logs")
        dead_leads = [lead for lead in leads if lead.tier == "dead"][:4]
        dead_logs: list[DeadLeadLog] = []
        revived_lead = dead_leads[0]
        for i, lead in enumerate(dead_leads):
            marked = lead.created_at + timedelta(days=random.randint(5, 25))
            revived_at = marked + timedelta(days=7) if i == 0 else None
            payload = {
                "id": uuid.uuid4(),
                "lead_id": lead.id,
                "reason": DEAD_REASON_POOL[i],
                "note": f"Marked dead due to {DEAD_REASON_POOL[i]} after review.",
                "marked_dead_at": marked,
                "revived_at": revived_at,
                "created_at": marked,
            }
            dead_logs.append(DeadLeadLog(**filter_model_kwargs(DeadLeadLog, payload)))
        db.add_all(dead_logs)
        counts["dead_logs"] = len(dead_logs)

        if escalations:
            escalations[0].lead_id = revived_lead.id

        print("Seeding webhook_receipts")
        receipts: list[WebhookReceipt] = []
        providers = ["zapier", "hubspot", "typeform", "make", "custom"]
        duplicate_prefix = f"zapier-dup-{uuid.uuid4().hex[:8]}"
        for i in range(10):
            if i >= 8:
                provider = "zapier"
                status = "duplicate"
                key = f"{duplicate_prefix}-{i-7}"
            else:
                provider = random.choice(providers)
                status = "received"
                key = f"{provider}-{uuid.uuid4()}"
            payload = {
                "id": uuid.uuid4(),
                "provider": provider,
                "idempotency_key": key,
                "status": status,
                "created_at": now_utc() - timedelta(days=random.randint(0, 20)),
            }
            receipts.append(WebhookReceipt(**filter_model_kwargs(WebhookReceipt, payload)))
        db.add_all(receipts)
        counts["receipts"] = len(receipts)

        print("Seeding qr_badge_tokens")
        tokens: list[QRBadgeToken] = []
        hot_for_tokens = [lead for lead in leads if lead.tier == "hot"][:8]
        for i, lead in enumerate(hot_for_tokens):
            expires_at = now_utc() - timedelta(days=5) if i == 0 else now_utc() + timedelta(days=30)
            payload = {
                "id": uuid.uuid4(),
                "token": secrets.token_urlsafe(32),
                "lead_id": lead.id,
                "badge_type": random.choice(["verified_lead", "event_attendee", "demo_booked"]),
                "expires_at": expires_at,
                "created_at": now_utc() - timedelta(days=random.randint(1, 10)),
            }
            tokens.append(QRBadgeToken(**filter_model_kwargs(QRBadgeToken, payload)))
        db.add_all(tokens)
        counts["tokens"] = len(tokens)

        print("Seeding audit_logs")
        audits: list[AuditLog] = []
        failed_rows = {5, 21, 36}
        for i in range(40):
            actor = random.choice(users)
            entity_type = random.choice(["lead", "user", "alert", "escalation"])
            if entity_type == "lead":
                ent_uuid = random.choice(leads).id
            elif entity_type == "user":
                ent_uuid = random.choice(users).id
            elif entity_type == "alert" and alerts:
                ent_uuid = random.choice(alerts).id
            elif entity_type == "escalation" and escalations:
                ent_uuid = random.choice(escalations).id
            else:
                ent_uuid = random.choice(leads).id

            action = random.choice(AUDIT_ACTION_POOL)
            outcome = "failure" if i in failed_rows else "success"
            created = now_utc() - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23))
            metadata = {"trace_id": str(uuid.uuid4()), "context": random.choice(["api", "webhook", "pipeline", "manual"])}
            if action == "lead_scored":
                picked = random.choice(leads)
                metadata.update(
                    {
                        "previous_tier": random.choice(["warm", "cold"]),
                        "new_tier": picked.tier,
                        "score": int(picked.total_score or 0),
                    }
                )
            if action == "lead_revived":
                metadata.update({"lead_id": str(revived_lead.id), "revived": True})
            if action == "qr_token_generated":
                metadata.update({"token_state": random.choice(["active", "expired"])})

            payload = {
                "id": uuid.uuid4(),
                "actor_user_id": actor.id,
                "actor_id": actor.id,
                "actor_role": actor.role,
                "action": action,
                "entity_type": entity_type,
                "entity_id": str(ent_uuid),
                "outcome": outcome,
                "metadata_json": metadata,
                "ip_address": f"192.168.1.{random.randint(10, 250)}",
                "message": f"{action} {outcome}",
                "created_at": created,
            }
            audits.append(AuditLog(**filter_model_kwargs(AuditLog, payload)))
        db.add_all(audits)
        counts["audits"] = len(audits)

        db.commit()
        print("--- Seed complete ---")
        print(
            f"Users: {counts['users']} | Leads: {counts['leads']} | Events: {counts['events']} | "
            f"Outreach logs: {counts['outreach']} | Alerts: {counts['alerts']} | Escalations: {counts['escalations']} | "
            f"Dead logs: {counts['dead_logs']} | Audit logs: {counts['audits']} | "
            f"Webhook receipts: {counts['receipts']} | QR tokens: {counts['tokens']}"
        )
    except Exception as exc:
        db.rollback()
        print(f"Seeding failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed LeadPulse DB with realistic E2E data.")
    parser.add_argument("--reset", action="store_true", help="Delete existing rows before seeding.")
    args = parser.parse_args()
    seed(reset=args.reset)
