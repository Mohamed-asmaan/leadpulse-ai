import { API_BASE } from "./config";
import { getToken } from "./auth";
import { parseApiErrorResponse } from "./parseApiError";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorResponse(res));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
