"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Bot, Flame, Sparkles, Target, Zap } from "lucide-react";

import type { Lead } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export type AiSuggestion = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
  cta: string;
};

/** Rule-based AI suggestions from live lead rows using backend-aligned signals. */
export function buildAiSuggestions(leads: Lead[], opts?: { isAdmin?: boolean }): AiSuggestion[] {
  const isAdmin = opts?.isAdmin ?? false;
  const out: AiSuggestion[] = [];

  const hotNoTouch = leads.filter((l) => l.tier === "hot" && !l.first_outreach_at);
  for (const l of hotNoTouch.slice(0, 5)) {
    out.push({
      id: `hot-${l.id}`,
      priority: "high",
      title: `Priority: ${l.name}`,
      detail: "HOT tier with no automated first outreach logged yet. Open workspace and send instant outreach.",
      href: `/leads/${l.id}`,
      cta: "Open AI workspace",
    });
  }

  const warm = leads.filter((l) => l.tier === "warm" && (l.total_score ?? 0) >= 55);
  for (const l of warm.slice(0, 3)) {
    out.push({
      id: `warm-${l.id}`,
      priority: "medium",
      title: `Nurture: ${l.name}`,
      detail: "WARM band. Review enrichment and add a timeline event (demo booked) to push toward HOT.",
      href: `/leads/${l.id}`,
      cta: "Review scores",
    });
  }

  if (isAdmin) {
    const unassignedHot = leads.filter((l) => l.tier === "hot" && !l.assigned_to_id);
    if (unassignedHot.length > 0) {
      const l = unassignedHot[0];
      out.push({
        id: "assign-hot",
        priority: "high",
        title: `${unassignedHot.length} HOT lead(s) unassigned`,
        detail: "Assign owners so reps get RBAC visibility and SLA tracking applies.",
        href: `/leads/${l.id}`,
        cta: "Assign from workspace",
      });
    }
  }

  const unscored = leads.filter((l) => l.total_score == null && l.scored_at == null);
  if (unscored.length > 0) {
    out.push({
      id: "pipeline",
      priority: "low",
      title: `${unscored.length} lead(s) still scoring`,
      detail: "Background pipeline (enrich to AI score to automation) may still be running. Refresh in a few seconds.",
      href: "/leads",
      cta: "View Lead Management",
    });
  }

  if (out.length === 0) {
    out.push({
      id: "all-clear",
      priority: "low",
      title: "No urgent AI actions",
      detail: "Keep logging email opens and page visits so engagement scoring stays accurate.",
      href: "/integrations",
      cta: "Wire tracking & ads",
    });
  }

  return out;
}

export function AiAutomationAssistant({
  leads,
  isAdmin,
  compact,
}: {
  leads: Lead[];
  isAdmin?: boolean;
  compact?: boolean;
}) {
  const suggestions = buildAiSuggestions(leads, { isAdmin });
  const scored = leads.filter((l) => l.total_score != null);
  const avg =
    scored.length === 0 ? null : Math.round(scored.reduce((s, l) => s + (l.total_score ?? 0), 0) / scored.length);

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          AI Studio
        </div>
        <p className="text-xs text-muted-foreground">
          {suggestions[0]?.detail.slice(0, 120)}
          {suggestions[0] && suggestions[0].detail.length > 120 ? "…" : ""}
        </p>
        <Link
          href="/intelligence"
          className="inline-flex text-xs font-medium text-primary hover:underline"
        >
          Open full AI assistant →
        </Link>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 bg-muted/30 border-b border-border">
        <div className="p-2 rounded-lg bg-card border border-border">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">AI automation assistant</h2>
            <Badge variant="outline" className="text-[10px] font-normal border-border text-muted-foreground">
              rules + ML blend
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-normal">
            Suggestions use the same HOT/WARM/COLD model and outreach state as the backend, similar to CRM playbook
            hints, without a separate chatbot.
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
          <Stat icon={<Target className="h-4 w-4 mx-auto text-emerald-600" />} label="Scored in view" value={String(scored.length)} />
          <Stat icon={<Zap className="h-4 w-4 mx-auto text-amber-600" />} label="Avg AI score" value={avg == null ? "N/A" : String(avg)} />
          <Stat icon={<Flame className="h-4 w-4 mx-auto text-red-600" />} label="HOT in view" value={String(leads.filter((l) => l.tier === "hot").length)} />
        </div>
        <ul className="space-y-2">
          {suggestions.slice(0, 8).map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-border bg-card/80 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "text-[10px] uppercase font-semibold " +
                      (s.priority === "high"
                        ? "text-destructive"
                        : s.priority === "medium"
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-muted-foreground")
                    }
                  >
                    {s.priority}
                  </span>
                  <span className="text-sm font-medium text-foreground">{s.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.detail}</p>
              </div>
              <Link
                href={s.href}
                className="shrink-0 inline-flex h-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-medium px-3 hover:bg-primary/90"
              >
                {s.cta}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 py-2 px-2">
      {icon}
      <div className="text-lg font-semibold tabular-nums text-foreground mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}
