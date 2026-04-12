const MOCK_KEY = "lp_use_mock_leads";

/** Mock leads are dev-only; production (e.g. Vercel) always uses the real API / Postgres. */
function mockAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function getUseMockLeads(): boolean {
  if (typeof window === "undefined") return false;
  if (!mockAllowed()) return false;
  return window.localStorage.getItem(MOCK_KEY) === "1";
}

export function setUseMockLeads(value: boolean) {
  if (typeof window === "undefined") return;
  if (!mockAllowed()) return;
  if (value) window.localStorage.setItem(MOCK_KEY, "1");
  else window.localStorage.removeItem(MOCK_KEY);
  window.dispatchEvent(new Event("lp-prefs-changed"));
}
