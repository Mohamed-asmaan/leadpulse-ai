/** First path segment → human label (Open Mercato–style backoffice breadcrumb trail). */
export const CRUMB_LABELS: Record<string, string> = {
  overview: "Overview",
  capture: "Capture",
  leads: "Lead Management",
  pipeline: "Pipeline",
  integrations: "Integrations",
  analytics: "Analytics",
  settings: "Settings",
  login: "Sign in",
};

export function breadcrumbFromPath(pathname: string): { href: string; label: string }[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [{ href: "/overview", label: "Overview" }];
  const out: { href: string; label: string }[] = [];
  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    acc += `/${parts[i]}`;
    const seg = parts[i];
    const isUuid = /^[0-9a-f-]{36}$/i.test(seg);
    const label = isUuid ? "Detail" : CRUMB_LABELS[seg] ?? seg.replace(/-/g, " ");
    out.push({ href: acc, label });
  }
  return out;
}
