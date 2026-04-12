import type { Lead } from "./types";

export type LeadListFilters = {
  tier: string;
  source: string;
  minScore: string;
  maxScore: string;
  dateFrom: string;
  dateTo: string;
};

export const defaultFilters: LeadListFilters = {
  tier: "",
  source: "",
  minScore: "",
  maxScore: "",
  dateFrom: "",
  dateTo: "",
};

export function filterLeadsClient(leads: Lead[], f: LeadListFilters): Lead[] {
  return leads.filter((l) => {
    if (f.tier && (l.tier || "") !== f.tier) return false;
    if (f.source && !l.source.toLowerCase().includes(f.source.toLowerCase())) return false;
    if (f.minScore !== "" && (l.total_score ?? -1) < Number(f.minScore)) return false;
    if (f.maxScore !== "" && (l.total_score ?? 999) > Number(f.maxScore)) return false;
    const c = new Date(l.created_at).getTime();
    if (f.dateFrom) {
      const start = new Date(f.dateFrom).setHours(0, 0, 0, 0);
      if (c < start) return false;
    }
    if (f.dateTo) {
      const end = new Date(f.dateTo).setHours(23, 59, 59, 999);
      if (c > end) return false;
    }
    return true;
  });
}

export function buildApiQuery(f: LeadListFilters, limit: number): string {
  const p = new URLSearchParams();
  p.set("limit", String(limit));
  if (f.tier) p.set("tier", f.tier);
  if (f.source) p.set("source", f.source);
  if (f.minScore !== "") p.set("min_score", f.minScore);
  if (f.maxScore !== "") p.set("max_score", f.maxScore);
  if (f.dateFrom) p.set("created_from", new Date(f.dateFrom).toISOString());
  if (f.dateTo) p.set("created_to", new Date(`${f.dateTo}T23:59:59`).toISOString());
  return `?${p.toString()}`;
}
