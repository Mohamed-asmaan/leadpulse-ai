import { API_BASE } from "./config";

/** Inbound lead capture (ads, forms, Zapier). */
export const WEBHOOK_LEADS_URL = `${API_BASE}/api/v1/webhooks/leads`;

/** Behavioral events → timeline + re-score. */
export const TRACK_EVENT_URL = `${API_BASE}/api/v1/public/track/event`;

/** Authenticated REST capture. */
export const REST_LEADS_URL = `${API_BASE}/api/v1/leads`;
