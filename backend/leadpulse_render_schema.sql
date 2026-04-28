CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  hashed_password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'sales', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  company TEXT,
  source TEXT,
  capture_channel TEXT,
  raw_capture_payload JSONB,
  integrity_sha256 TEXT,
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
  job_title TEXT,
  industry TEXT,
  company_size TEXT,
  country TEXT,
  enrichment_provider TEXT,
  enriched_at TIMESTAMPTZ,
  fit_score NUMERIC(5,2),
  intent_score NUMERIC(5,2),
  predictive_score NUMERIC(5,2),
  total_score NUMERIC(5,2),
  tier TEXT CHECK (tier IN ('hot', 'warm', 'cold', 'dead')),
  score_reasons TEXT,
  scored_at TIMESTAMPTZ,
  is_dead BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  grade TEXT,
  score_reasons JSONB,
  is_dead_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  channel TEXT,
  payload JSONB,
  summary TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE outreach_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'call', 'other')),
  subject TEXT,
  message TEXT,
  status TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lead_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  trigger_reason TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE escalation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES lead_alerts(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dead_lead_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  reason TEXT,
  note TEXT,
  marked_dead_at TIMESTAMPTZ,
  revived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  outcome TEXT,
  metadata_json JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE qr_badge_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  badge_type TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_lead_scores_updated_at
BEFORE UPDATE ON lead_scores
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_lead_alerts_updated_at
BEFORE UPDATE ON lead_alerts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_capture_channel ON leads(capture_channel);
CREATE INDEX idx_leads_total_score ON leads(total_score);
CREATE INDEX idx_leads_tier ON leads(tier);
CREATE INDEX idx_leads_assigned_to_id ON leads(assigned_to_id);
CREATE INDEX idx_leads_created_at ON leads(created_at);

CREATE INDEX idx_lead_scores_lead_id ON lead_scores(lead_id);

CREATE INDEX idx_lead_events_lead_id ON lead_events(lead_id);
CREATE INDEX idx_lead_events_occurred_at ON lead_events(occurred_at);
CREATE INDEX idx_lead_events_event_type ON lead_events(event_type);

CREATE INDEX idx_outreach_logs_lead_id ON outreach_logs(lead_id);
CREATE INDEX idx_outreach_logs_sent_at ON outreach_logs(sent_at);

CREATE INDEX idx_lead_alerts_lead_id ON lead_alerts(lead_id);

CREATE INDEX idx_escalation_logs_lead_id ON escalation_logs(lead_id);

CREATE INDEX idx_dead_lead_logs_lead_id ON dead_lead_logs(lead_id);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity_type_entity_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_webhook_receipts_idempotency_key ON webhook_receipts(idempotency_key);

CREATE INDEX idx_qr_badge_tokens_token ON qr_badge_tokens(token);
CREATE INDEX idx_qr_badge_tokens_lead_id ON qr_badge_tokens(lead_id);
