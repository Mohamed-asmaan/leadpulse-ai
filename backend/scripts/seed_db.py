import argparse
import hashlib
import json
import random
import secrets
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from faker import Faker

# Ensure backend root is importable when running from scripts/
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


fake = Faker()
random.seed(42)
Faker.seed(42)


SOURCE_POOL = ["website_form", "webhook", "api", "linkedin", "referral", "event"]
CAPTURE_POOL = ["manual", "api", "webhook"]
EVENT_TYPE_POOL = [
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
CHANNEL_POOL = ["web", "email", "webhook", "api", "phone"]
OUTREACH_STATUS_POOL = ["sent", "delivered", "opened", "bounced", "replied"]
OUTREACH_SUBJECTS = [
    "Following up on your demo request",
    "Quick intro - LeadPulse",
    "Can we help your team prioritize better?",
    "Next step for your lead qualification workflow",
    "LeadPulse onboarding support",
]
INDUSTRIES = [
    "SaaS",
    "FinTech",
    "HealthTech",
    "EdTech",
    "E-commerce",
    "Logistics",
    "Real Estate",
    "Cybersecurity",
]
COMPANY_BANDS = ["1-10", "11-50", "51-200", "201-500", "500+"]
COUNTRIES = ["US", "IN", "GB", "DE", "SG", "AE", "CA", "AU"]
TRIGGER_REASONS = ["high_score_no_contact", "sla_breach_5min", "demo_requested_unassigned"]
DEAD_REASONS = [
    "no_engagement_30_days",
    "bounced_email",
    "competitor_chosen",
    "budget_freeze",
]
AUDIT_ACTIONS = [
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


def random_dt_between(start: datetime, end: datetime) -> datetime:
    if end <= start:
        return start
    delta = int((end - start).total_seconds())
    return start + timedelta(seconds=random.randint(0, delta))


def normalized_phone(phone: str) -> str:
    return "".join(ch for ch in phone if ch.isdigit())


def make_capture_payload() -> dict:
    return {
        "utm_source": random.choice(["google", "linkedin", "newsletter", "youtube", "direct"]),
        "utm_campaign": random.choice(["q2_outbound", "enterprise_push", "demo_drive", "retargeting"]),
        "page": random.choice(["/pricing", "/demo", "/features", "/compare", "/case-studies"]),
        "referrer": random.choice(["https://google.com", "https://linkedin.com", "https://bing.com"]),
    }


def payload_sha256(payload: dict) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def event_payload(event_type: str) -> dict:
    if event_type == "page_view":
        return {"page": random.choice(["/pricing", "/features", "/blog/roi"]), "duration_seconds": random.randint(15, 360)}
    if event_type == "email_open":
        return {"campaign": random.choice(["intro", "follow_up", "case_study"]), "device": random.choice(["mobile", "desktop"])}
    if event_type == "email_click":
        return {"link": random.choice(["/book-demo", "/pricing", "/roi-calculator"]), "campaign": "follow_up"}
    if event_type == "form_submit":
        return {"form_name": random.choice(["demo_form", "contact_form"]), "fields_completed": random.randint(4, 9)}
    if event_type == "webhook_received":
        return {"provider": random.choice(["zapier", "hubspot", "make"]), "status": "accepted"}
    if event_type == "demo_requested":
        return {"preferred_slot": fake.iso8601(), "team_size": random.choice([5, 12, 50, 150])}
    if event_type == "pricing_viewed":
        return {"plan": random.choice(["starter", "growth", "enterprise"]), "revisited": random.choice([True, False])}
    if event_type == "doc_downloaded":
        return {"asset": random.choice(["roi-guide.pdf", "security-whitepaper.pdf"]), "source": "email"}
    if event_type == "call_scheduled":
        return {"meeting_platform": random.choice(["meet", "zoom"]), "duration_minutes": random.choice([15, 30, 45])}
    return {"note": "generic interaction"}


def tier_bundle(tier: str) -> tuple[int, int, int, int]:
    if tier == "hot":
        fit = random.randint(75, 95)
        intent = random.randint(70, 95)
        predictive = random.randint(75, 95)
        total = random.randint(80, 99)
    elif tier == "warm":
        fit = random.randint(50, 79)
        intent = random.randint(45, 79)
        predictive = random.randint(45, 79)
        total = random.randint(50, 79)
    elif tier == "cold":
        fit = random.randint(20, 49)
        intent = random.randint(20, 49)
        predictive = random.randint(20, 49)
        total = random.randint(20, 49)
    else:
        fit = random.randint(5, 25)
        intent = random.randint(5, 25)
        predictive = random.randint(5, 25)
        total = random.randint(5, 19)
    return fit, intent, predictive, total


def grade_for_tier(tier: str) -> str:
    return {"hot": "A", "warm": "B", "cold": "C", "dead": "D"}[tier]


def reset_tables(db) -> None:
    print("Resetting existing rows...")
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
    print("Reset complete.")


def seed(reset: bool = False) -> None:
    db = SessionLocal()
    counts = {
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
            reset_tables(db)

        print("Seeding users...")
        users = [
            User(
                id=uuid.uuid4(),
                email="admin@leadpulse.io",
                full_name="LeadPulse Admin",
                hashed_password=hash_password("Admin1234!"),
                role="admin",
            ),
            User(
                id=uuid.uuid4(),
                email="manager1@leadpulse.io",
                full_name="Manager One",
                hashed_password=hash_password("Manager1234!"),
                role="manager",
            ),
            User(
                id=uuid.uuid4(),
                email="manager2@leadpulse.io",
                full_name="Manager Two",
                hashed_password=hash_password("Manager1234!"),
                role="manager",
            ),
            User(
                id=uuid.uuid4(),
                email="sales1@leadpulse.io",
                full_name="Sales Rep One",
                hashed_password=hash_password("Sales1234!"),
                role="sales",
            ),
            User(
                id=uuid.uuid4(),
                email="sales2@leadpulse.io",
                full_name="Sales Rep Two",
                hashed_password=hash_password("Sales1234!"),
                role="sales",
            ),
            User(
                id=uuid.uuid4(),
                email="sales3@leadpulse.io",
                full_name="Sales Rep Three",
                hashed_password=hash_password("Sales1234!"),
                role="sales",
            ),
        ]
        db.add_all(users)
        db.commit()
        counts["users"] = len(users)

        admin_user = next(u for u in users if u.role == "admin")
        manager_users = [u for u in users if u.role == "manager"]
        sales_users = [u for u in users if u.role == "sales"]
        low_activity_sales_user = sales_users[2]

        print("Seeding leads...")
        tiers = ["hot"] * 8 + ["warm"] * 10 + ["cold"] * 8 + ["dead"] * 4
        random.shuffle(tiers)

        sources = (SOURCE_POOL * 5)[:30]
        channels = (CAPTURE_POOL * 10)[:30]
        random.shuffle(sources)
        random.shuffle(channels)

        leads: list[Lead] = []
        ninety_days_ago = now_utc() - timedelta(days=90)
        for i in range(30):
            tier = tiers[i]
            fit, intent, predictive, total = tier_bundle(tier)
            created_at = random_dt_between(ninety_days_ago, now_utc() - timedelta(days=1))
            scored_at = created_at + timedelta(hours=random.randint(1, 120))
            enriched_at = created_at + timedelta(hours=random.randint(1, 72))

            first = fake.first_name()
            last = fake.last_name()
            email = f"{first.lower()}.{last.lower()}.{i+1}@{fake.free_email_domain()}"
            company = fake.company()
            phone = fake.phone_number()
            capture = make_capture_payload()

            assigned_user = random.choice(sales_users)
            if i == 0:
                assigned_user = low_activity_sales_user

            lead = Lead(
                id=uuid.uuid4(),
                name=f"{first} {last}",
                email=email,
                phone=phone,
                phone_normalized=normalized_phone(phone),
                company=company,
                source=sources[i],
                capture_channel=channels[i],
                raw_capture_payload=capture,
                integrity_sha256=payload_sha256(capture),
                assigned_to_id=assigned_user.id,
                job_title=fake.job(),
                industry=random.choice(INDUSTRIES),
                company_size_band=random.choice(COMPANY_BANDS),
                company_size_estimate=random.choice([8, 15, 30, 120, 260, 700, 1600]),
                location_country=random.choice(COUNTRIES),
                enrichment_provider="clearbit",
                enriched_at=enriched_at,
                fit_score=fit,
                intent_score=intent,
                predictive_score=predictive,
                total_score=total,
                tier=tier,
                fit_reason=f"Strong ICP match: {company} in {random.choice(INDUSTRIES)} with {random.choice(['mid-market', 'enterprise', 'scaling'])} profile.",
                intent_reason=f"Intent signal: {random.choice(['pricing page revisits', 'demo page activity', 'multiple content downloads'])}.",
                predictive_reason=f"Behavior pattern indicates {random.choice(['high conversion probability', 'moderate engagement risk', 'low immediate urgency'])}.",
                score_summary=f"{tier.upper()} lead with score {total}/100 based on fit, intent, and engagement.",
                scored_at=scored_at,
                notes=f"Imported from {sources[i]} capture flow.",
                first_outreach_at=None,
                last_outreach_channel=None,
                authenticity_trust=random.choice(["trusted", "review", "high_confidence"]),
                bot_risk_score=random.randint(1, 30),
                created_at=created_at,
                updated_at=max(created_at, scored_at),
            )
            leads.append(lead)
            print(f"  Created lead: {lead.email} [{lead.tier}]")

        # Edge case: one lead with no enrichment
        no_enrichment_lead = leads[1]
        no_enrichment_lead.job_title = None
        no_enrichment_lead.industry = None
        no_enrichment_lead.company_size_band = None
        no_enrichment_lead.company_size_estimate = None
        no_enrichment_lead.location_country = None
        no_enrichment_lead.enrichment_provider = None
        no_enrichment_lead.enriched_at = None

        # Track a no-outreach lead
        no_outreach_lead = leads[2]

        db.add_all(leads)
        db.commit()
        counts["leads"] = len(leads)

        print("Seeding lead_scores...")
        lead_scores: list[LeadScore] = []
        for lead in leads:
            fit = lead.fit_score or 0
            intent = lead.intent_score or 0
            pred = lead.predictive_score or 0
            reasons = [
                {"factor": "fit", "weight": 0.4, "value": fit, "note": "ICP match strength"},
                {"factor": "intent", "weight": 0.3, "value": intent, "note": "Recent buying signal intensity"},
                {"factor": "predictive", "weight": 0.3, "value": pred, "note": "Behavioral conversion likelihood"},
            ]
            lead_scores.append(
                LeadScore(
                    id=uuid.uuid4(),
                    lead_id=lead.id,
                    score=lead.total_score or 0,
                    grade=grade_for_tier(lead.tier or "dead"),
                    score_reasons=reasons,
                    is_dead=(lead.tier == "dead"),
                    last_calculated=lead.scored_at or now_utc(),
                )
            )
        db.add_all(lead_scores)

        print("Seeding lead_events...")
        lead_events: list[LeadEvent] = []
        sixty_days_ago = now_utc() - timedelta(days=60)
        for lead in leads:
            event_count = random.randint(3, 8)
            start = max(lead.created_at, sixty_days_ago)

            lead_events.append(
                LeadEvent(
                    id=uuid.uuid4(),
                    lead_id=lead.id,
                    event_type="lead_created",
                    channel="api",
                    payload={"source": lead.source, "capture_channel": lead.capture_channel},
                    occurred_at=start,
                    summary="Lead record created",
                )
            )
            for _ in range(event_count - 1):
                et = random.choice(EVENT_TYPE_POOL)
                oc = random_dt_between(start + timedelta(minutes=5), now_utc())
                lead_events.append(
                    LeadEvent(
                        id=uuid.uuid4(),
                        lead_id=lead.id,
                        event_type=et,
                        channel=random.choice(CHANNEL_POOL),
                        payload=event_payload(et),
                        occurred_at=oc,
                        summary=f"{et.replace('_', ' ').title()} recorded",
                    )
                )
        db.add_all(lead_events)
        counts["events"] = len(lead_events)

        print("Seeding outreach_logs...")
        outreach_logs: list[OutreachLog] = []
        for lead in leads:
            if lead.id == no_outreach_lead.id:
                continue
            log_count = random.randint(2, 5)
            for _ in range(log_count):
                created_at = random_dt_between(lead.created_at + timedelta(hours=1), now_utc())
                channel = random.choice(["email", "sms", "email", "sms", "call"])
                outreach_logs.append(
                    OutreachLog(
                        id=uuid.uuid4(),
                        lead_id=lead.id,
                        channel=channel,
                        subject=random.choice(OUTREACH_SUBJECTS),
                        message=(
                            f"Hi {lead.name.split()[0]}, we noticed your interest in optimizing lead qualification. "
                            "Would you be open to a quick 20-minute walkthrough this week? "
                            "We can share a tailored plan for your current funnel."
                        ),
                        status=random.choice(OUTREACH_STATUS_POOL),
                        created_at=created_at,
                    )
                )
        db.add_all(outreach_logs)
        counts["outreach"] = len(outreach_logs)

        print("Seeding lead_alerts...")
        hot_leads = [l for l in leads if l.tier == "hot"]
        warm_leads = [l for l in leads if l.tier == "warm"]
        alert_leads = hot_leads + random.sample(warm_leads, k=min(7, len(warm_leads)))
        alert_leads = alert_leads[:15]

        lead_alerts: list[LeadAlert] = []
        now = now_utc()
        for i, lead in enumerate(alert_leads):
            trig = now - timedelta(days=random.randint(0, 20), hours=random.randint(0, 23))
            responded = None if i < 4 else trig + timedelta(minutes=random.randint(3, 240))
            lead_alerts.append(
                LeadAlert(
                    id=uuid.uuid4(),
                    lead_id=lead.id,
                    assigned_to_id=lead.assigned_to_id,
                    trigger_reason=random.choice(TRIGGER_REASONS),
                    triggered_at=trig,
                    responded_at=responded,
                    escalated=i in {0, 1, 2},
                )
            )
        db.add_all(lead_alerts)
        counts["alerts"] = len(lead_alerts)

        print("Seeding escalation_logs...")
        escalation_logs: list[EscalationLog] = []
        escalated_alerts = [a for a in lead_alerts if a.escalated][:3]
        for idx, alert in enumerate(escalated_alerts):
            escalation_logs.append(
                EscalationLog(
                    id=uuid.uuid4(),
                    alert_id=alert.id,
                    lead_id=alert.lead_id,
                    manager_user_id=manager_users[idx % len(manager_users)].id,
                    reason=random.choice(["no_sales_response", "repeated_sla_breach"]),
                    note="Lead requested demo twice. No follow-up from assigned rep in 48h.",
                    created_at=alert.triggered_at + timedelta(hours=2),
                )
            )
        db.add_all(escalation_logs)
        counts["escalations"] = len(escalation_logs)

        print("Seeding dead_lead_logs...")
        dead_leads = [l for l in leads if l.tier == "dead"][:4]
        dead_logs: list[DeadLeadLog] = []
        revived_target = dead_leads[0]
        for i, lead in enumerate(dead_leads):
            marked = lead.created_at + timedelta(days=random.randint(5, 40))
            revived = marked + timedelta(days=10) if i == 0 else None
            dead_logs.append(
                DeadLeadLog(
                    id=uuid.uuid4(),
                    lead_id=lead.id,
                    reason=DEAD_REASONS[i % len(DEAD_REASONS)],
                    note=f"Lifecycle flag: {DEAD_REASONS[i % len(DEAD_REASONS)]} detected during review cycle.",
                    marked_dead_at=marked,
                    revived_at=revived,
                )
            )
        db.add_all(dead_logs)
        counts["dead_logs"] = len(dead_logs)

        # Complex lifecycle edge: ensure one lead has both escalation and revived dead log
        if escalation_logs:
            escalation_logs[0].lead_id = revived_target.id

        print("Seeding webhook_receipts...")
        providers = ["zapier", "hubspot", "typeform", "make", "custom"]
        receipts: list[WebhookReceipt] = []
        dup_base = f"zapier-dup-{uuid.uuid4()}"
        for i in range(10):
            provider = random.choice(providers)
            if i in (8, 9):
                provider = "zapier"
                status = "duplicate"
                idem = f"{dup_base}-{i}"
            else:
                status = "received"
                idem = f"{provider}-{uuid.uuid4()}"
            receipts.append(
                WebhookReceipt(
                    id=uuid.uuid4(),
                    provider=provider,
                    idempotency_key=idem,
                    status=status,
                    created_at=now_utc() - timedelta(days=random.randint(0, 20)),
                )
            )
        db.add_all(receipts)
        counts["receipts"] = len(receipts)

        print("Seeding qr_badge_tokens...")
        qr_tokens: list[QRBadgeToken] = []
        hot_for_tokens = [l for l in leads if l.tier == "hot"][:8]
        for i, lead in enumerate(hot_for_tokens):
            expires_at = now_utc() - timedelta(days=5) if i < 2 else now_utc() + timedelta(days=30)
            created_ts = now_utc() - timedelta(days=random.randint(1, 15))
            qr_tokens.append(
                QRBadgeToken(
                    id=uuid.uuid4(),
                    token=secrets.token_urlsafe(32),
                    lead_id=lead.id,
                    badge_type=random.choice(["verified_lead", "event_attendee", "demo_booked"]),
                    created_at=created_ts,
                )
            )
            # Model lacks expires_at column, keep expiry semantics in audit metadata below.
            if expires_at < now_utc():
                pass
        db.add_all(qr_tokens)
        counts["tokens"] = len(qr_tokens)

        print("Seeding audit_logs...")
        audits: list[AuditLog] = []
        failure_indexes = {7, 19, 33}
        lead_map = {l.id: l for l in leads}
        alert_ids = [a.id for a in lead_alerts]
        escalation_ids = [e.id for e in escalation_logs]
        entities = ["lead", "user", "alert", "escalation"]
        for i in range(40):
            actor = random.choice(users)
            entity_type = random.choice(entities)
            if entity_type == "lead":
                entity_id = str(random.choice(leads).id)
            elif entity_type == "user":
                entity_id = str(random.choice(users).id)
            elif entity_type == "alert" and alert_ids:
                entity_id = str(random.choice(alert_ids))
            elif entity_type == "escalation" and escalation_ids:
                entity_id = str(random.choice(escalation_ids))
            else:
                entity_id = str(random.choice(leads).id)

            action = random.choice(AUDIT_ACTIONS)
            outcome = "failure" if i in failure_indexes else "success"
            created_at = now_utc() - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23))
            metadata = {
                "context": random.choice(["pipeline", "manual_action", "webhook_ingest", "scheduler"]),
                "trace_id": str(uuid.uuid4()),
            }
            if action == "lead_scored":
                selected_lead = random.choice(leads)
                metadata.update(
                    {
                        "lead_id": str(selected_lead.id),
                        "previous_tier": random.choice(["cold", "warm"]),
                        "new_tier": selected_lead.tier,
                        "score": selected_lead.total_score,
                    }
                )
            if action == "qr_token_generated":
                metadata.update(
                    {
                        "badge_type": random.choice(["verified_lead", "event_attendee", "demo_booked"]),
                        "token_state": random.choice(["active", "expired"]),
                    }
                )
            if action == "lead_revived":
                metadata.update({"lead_id": str(revived_target.id), "revived": True})

            audits.append(
                AuditLog(
                    id=uuid.uuid4(),
                    actor_user_id=actor.id,
                    actor_role=actor.role,
                    action=action,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    outcome=outcome,
                    metadata_json=metadata,
                    ip_address=f"192.168.1.{random.randint(2, 254)}",
                    message=f"{action} executed with {outcome}",
                    created_at=created_at,
                )
            )
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
    parser = argparse.ArgumentParser(description="Seed LeadPulse database with rich mock data.")
    parser.add_argument("--reset", action="store_true", help="Delete all existing rows before seeding.")
    args = parser.parse_args()
    seed(reset=args.reset)
