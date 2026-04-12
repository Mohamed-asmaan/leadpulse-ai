/**
 * API origin for browser and server.
 * - If NEXT_PUBLIC_API_URL is set, it is always used (production / custom dev).
 * - Otherwise in the browser we use same-origin `/leadpulse-api` (see next.config.mjs rewrites → FastAPI).
 * - On the server in development only, fall back to loopback. In production on Vercel, SSR uses
 *   same-origin `/leadpulse-api` via VERCEL_URL so outbound fetches never target 127.0.0.1 (blocked).
 */
const envUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

function serverApiBase(): string {
  if (envUrl) return envUrl;
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000";
  }
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) {
    return `https://${vercel}/leadpulse-api`;
  }
  return "http://127.0.0.1:8000";
}

export const API_BASE =
  envUrl || (typeof window !== "undefined" ? "/leadpulse-api" : serverApiBase());
