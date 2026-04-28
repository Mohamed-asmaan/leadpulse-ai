CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'sales', 'manager'));

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS score_reasons TEXT,
  ADD COLUMN IF NOT EXISTS is_dead BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE leads
  ALTER COLUMN source DROP NOT NULL,
  ALTER COLUMN capture_channel DROP NOT NULL;

ALTER TABLE leads
  ALTER COLUMN raw_capture_payload TYPE JSONB USING raw_capture_payload::JSONB;

ALTER TABLE leads
  ALTER COLUMN fit_score TYPE NUMERIC(5,2) USING fit_score::NUMERIC(5,2),
  ALTER COLUMN intent_score TYPE NUMERIC(5,2) USING intent_score::NUMERIC(5,2),
  ALTER COLUMN predictive_score TYPE NUMERIC(5,2) USING predictive_score::NUMERIC(5,2),
  ALTER COLUMN total_score TYPE NUMERIC(5,2) USING total_score::NUMERIC(5,2);

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_tier_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_tier_check CHECK (tier IN ('hot', 'warm', 'cold', 'dead'));

ALTER TABLE lead_scores
  ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_dead_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE lead_scores
SET calculated_at = COALESCE(calculated_at, last_calculated)
WHERE last_calculated IS NOT NULL;

UPDATE lead_scores
SET is_dead_flagged = COALESCE(is_dead_flagged, is_dead)
WHERE is_dead IS NOT NULL;

ALTER TABLE lead_scores
  ALTER COLUMN score DROP NOT NULL,
  ALTER COLUMN grade DROP NOT NULL;

ALTER TABLE lead_scores
  ALTER COLUMN score TYPE NUMERIC(5,2) USING score::NUMERIC(5,2),
  ALTER COLUMN score_reasons TYPE JSONB USING score_reasons::JSONB;

ALTER TABLE lead_events
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE lead_events
  ALTER COLUMN channel DROP NOT NULL,
  ALTER COLUMN payload TYPE JSONB USING payload::JSONB;

ALTER TABLE outreach_logs
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

ALTER TABLE outreach_logs
  ALTER COLUMN message DROP NOT NULL,
  ALTER COLUMN status DROP NOT NULL;

ALTER TABLE lead_alerts
  ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE lead_alerts
SET is_escalated = COALESCE(is_escalated, escalated)
WHERE escalated IS NOT NULL;

ALTER TABLE escalation_logs
  ALTER COLUMN alert_id DROP NOT NULL;

ALTER TABLE dead_lead_logs
  ALTER COLUMN marked_dead_at DROP NOT NULL;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_id UUID,
  ADD COLUMN IF NOT EXISTS entity_id_uuid UUID;

UPDATE audit_logs
SET actor_id = actor_user_id
WHERE actor_id IS NULL AND actor_user_id IS NOT NULL;

UPDATE audit_logs
SET entity_id_uuid = NULLIF(entity_id, '')::UUID
WHERE entity_id_uuid IS NULL
  AND entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

ALTER TABLE audit_logs
  ALTER COLUMN action TYPE TEXT,
  ALTER COLUMN entity_type TYPE TEXT,
  ALTER COLUMN outcome TYPE TEXT,
  ALTER COLUMN ip_address TYPE TEXT,
  ALTER COLUMN metadata_json TYPE JSONB USING metadata_json::JSONB;

ALTER TABLE qr_badge_tokens
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE qr_badge_tokens
  ALTER COLUMN lead_id DROP NOT NULL;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_lead_scores_updated_at ON lead_scores;
CREATE TRIGGER trg_lead_scores_updated_at
BEFORE UPDATE ON lead_scores
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_lead_alerts_updated_at ON lead_alerts;
CREATE TRIGGER trg_lead_alerts_updated_at
BEFORE UPDATE ON lead_alerts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_capture_channel ON leads(capture_channel);
CREATE INDEX IF NOT EXISTS idx_leads_total_score ON leads(total_score);
CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(tier);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to_id ON leads(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON lead_scores(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_occurred_at ON lead_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_lead_events_event_type ON lead_events(event_type);

CREATE INDEX IF NOT EXISTS idx_outreach_logs_lead_id ON outreach_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_logs_sent_at ON outreach_logs(sent_at);

CREATE INDEX IF NOT EXISTS idx_lead_alerts_lead_id ON lead_alerts(lead_id);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_lead_id ON escalation_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_dead_lead_logs_lead_id ON dead_lead_logs(lead_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_entity_id ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_receipts_idempotency_key ON webhook_receipts(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_qr_badge_tokens_token ON qr_badge_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_badge_tokens_lead_id ON qr_badge_tokens(lead_id);
