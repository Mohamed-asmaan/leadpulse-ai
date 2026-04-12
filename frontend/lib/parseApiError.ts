/**
 * Turn FastAPI / Starlette error bodies into short, human-readable strings.
 */
export async function parseApiErrorResponse(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const j = JSON.parse(raw) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") {
      if (d === "Invalid credentials") {
        return "Incorrect email or password. Use the demo accounts below, or ask an admin to reset your user.";
      }
      return d;
    }
    if (Array.isArray(d)) {
      return d
        .map((item: unknown) => {
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: string }).msg);
          }
          return JSON.stringify(item);
        })
        .join(" ");
    }
  } catch {
    /* not JSON */
  }
  const trimmed = raw.trim();
  if (trimmed.length > 0 && trimmed.length < 240) return trimmed;
  return `Request failed (${res.status})`;
}
