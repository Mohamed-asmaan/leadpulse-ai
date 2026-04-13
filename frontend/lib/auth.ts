/**
 * Session in localStorage keeps the SPA simple for coursework and demos.
 * For production hardening, prefer httpOnly cookies + CSRF and tighten CSP instead of long-lived tokens in JS storage.
 */
const TOKEN_KEY = "lp_token";
const ROLE_KEY = "lp_role";
const NAME_KEY = "lp_name";

export function saveSession(token: string, role: string, fullName: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(NAME_KEY, fullName);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}

export function getName() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NAME_KEY);
}
