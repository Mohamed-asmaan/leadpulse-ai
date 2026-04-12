/**
 * API origin for browser and server.
 * - If NEXT_PUBLIC_API_URL is set, it is always used (production / custom dev).
 * - Otherwise in the browser we use same-origin `/leadpulse-api` (see next.config.mjs rewrites → FastAPI).
 * - On the server (SSR) without env, fall back to loopback for any rare server-side fetches.
 */
const envUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export const API_BASE =
  envUrl ||
  (typeof window !== "undefined" ? "/leadpulse-api" : "http://127.0.0.1:8000");
