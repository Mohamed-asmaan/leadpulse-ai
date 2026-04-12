"use client";

import type { FunnelStageCounts } from "@/lib/leadMetrics";

const stages: { key: keyof FunnelStageCounts; label: string }[] = [
  { key: "captured", label: "Captured" },
  { key: "enriched", label: "Enriched" },
  { key: "scored", label: "Scored" },
  { key: "contacted", label: "Contacted" },
];

export function FunnelViz({ funnel }: { funnel: FunnelStageCounts }) {
  const max = Math.max(1, funnel.captured);
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Conversion funnel</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Operational stages derived from lead records (New → enriched → scored → first outreach).
        </p>
      </div>
      <div className="space-y-3">
        {stages.map((s) => {
          const v = funnel[s.key];
          const pct = Math.round((v / max) * 100);
          return (
            <div key={s.key}>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{s.label}</span>
                <span className="tabular-nums text-foreground">
                  {v} <span className="text-muted-foreground">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-card overflow-hidden border border-border">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-600 to-indigo-500 transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
