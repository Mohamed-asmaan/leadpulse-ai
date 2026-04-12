export type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  capture_channel?: string | null;
  raw_capture_payload?: Record<string, unknown> | null;
  integrity_sha256?: string | null;
  assigned_to_id?: string | null;
  job_title?: string | null;
  industry?: string | null;
  company_size_band?: string | null;
  company_size_estimate?: number | null;
  location_country?: string | null;
  enrichment_provider?: string | null;
  enriched_at?: string | null;
  fit_score?: number | null;
  intent_score?: number | null;
  predictive_score?: number | null;
  total_score?: number | null;
  tier?: string | null;
  fit_reason?: string | null;
  intent_reason?: string | null;
  predictive_reason?: string | null;
  score_summary?: string | null;
  scored_at?: string | null;
  first_outreach_at?: string | null;
  last_outreach_channel?: string | null;
  authenticity_trust?: string | null;
  bot_risk_score?: number | null;
  notes?: string | null;
};

export type LeadEvent = {
  id: string;
  lead_id: string;
  channel: string;
  event_type: string;
  payload?: Record<string, unknown> | null;
  occurred_at: string;
  summary?: string | null;
};

export type FunnelMetrics = {
  total_leads: number;
  hot: number;
  warm: number;
  cold: number;
  avg_response_seconds: number | null;
  conversion_proxy_rate: number | null;
};

export type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

export type OutreachRow = {
  id: string;
  lead_id: string;
  channel: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
};

export type LeadVerification = {
  profile_integrity_hash: string;
  qr_verify_paths: string[];
};

/** GET /api/v1/integrations/status — adapted from OM integration health (no secrets). */
export type IntegrationStatus = {
  hunter_configured: boolean;
  clearbit_configured: boolean;
  custom_enrichment_url_configured: boolean;
  resend_configured: boolean;
  twilio_configured: boolean;
  hot_sms_enabled: boolean;
  webhook_shared_secret_configured: boolean;
  public_tracking_secret_configured: boolean;
  synthetic_engagement_enabled: boolean;
};
