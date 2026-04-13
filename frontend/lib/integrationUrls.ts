import { API_BASE } from "./config";

/** Inbound lead capture (ads, forms, Zapier, Google Lead Form JSON). */
export const WEBHOOK_LEADS_URL = `${API_BASE}/api/v1/webhooks/leads`;

/** Meta Graph Lead Ads webhook (subscribe verification + lead delivery). */
export const META_WEBHOOK_URL = `${API_BASE}/api/v1/webhooks/meta`;

/** Behavioral events → timeline + re-score. */
export const TRACK_EVENT_URL = `${API_BASE}/api/v1/public/track/event`;

/** Public website form POST (use with embed script + X-Website-Form-Secret). */
export const WEBSITE_LEAD_URL = `${API_BASE}/api/v1/public/website-lead`;

/** Embeddable script for `<form data-leadpulse-website-lead>` on any site. */
export const WEBSITE_EMBED_SCRIPT_URL = `${API_BASE}/api/v1/public/embed/lead-form.js`;

/** Authenticated REST capture. */
export const REST_LEADS_URL = `${API_BASE}/api/v1/leads`;
