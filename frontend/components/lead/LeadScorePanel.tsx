"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { Lead } from "@/lib/types";

export function LeadScorePanel({ lead }: { lead: Lead }) {
  return (
    <section className="rounded-xl border border-border bg-muted/40 p-5 space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">LeadPulse AI scoring</h2>
            <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-violet-500/15 text-violet-800 dark:text-violet-200 border border-violet-500/30 px-2 py-0.5">
              Live model
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Rules (40% ICP fit · 30% intent · 30% engagement) plus an optional <strong className="text-foreground">ML blend</strong>{" "}
            (gradient boosting on the server). Timeline events and simulated engagement in dev also feed the score.
          </p>
        </div>
      </header>
      <div className="grid grid-cols-3 gap-3">
        <ScoreTile label="Fit (40%)" value={lead.fit_score} hint="Industry + size vs ICP" />
        <ScoreTile label="Intent (30%)" value={lead.intent_score} hint="Pricing / demo language" />
        <ScoreTile label="Engagement (30%)" value={lead.predictive_score} hint="Opens, clicks, signals" />
      </div>
      <div
        className="rounded-lg border border-border bg-background/60 p-3 flex items-baseline justify-between gap-3"
        title={lead.score_summary || undefined}
      >
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Composite</div>
        <div className="text-2xl font-semibold tabular-nums text-primary">{lead.total_score ?? "—"}</div>
        <div className="text-xs capitalize text-muted-foreground">{lead.tier || "—"}</div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explainable reasoning</h3>
        <ReasonBlock title="Fit model" text={lead.fit_reason} />
        <ReasonBlock title="Intent signals" text={lead.intent_reason} />
        <ReasonBlock title="Engagement layer" text={lead.predictive_reason} />
        {lead.score_summary ? (
          <div className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">{lead.score_summary}</div>
        ) : null}
      </div>
    </section>
  );
}

function ScoreTile({ label, value, hint }: { label: string; value: number | null | undefined; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/80 p-3 text-center" title={hint}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums text-foreground mt-1">{value ?? "—"}</div>
    </div>
  );
}

function ReasonBlock({ title, text }: { title: string; text: string | null | undefined }) {
  const [open, setOpen] = useState(true);
  if (!text) return null;
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-foreground bg-card/50 hover:bg-card"
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        {title}
      </button>
      {open ? <div className="px-3 py-2 text-xs text-muted-foreground leading-relaxed border-t border-border">{text}</div> : null}
    </div>
  );
}
