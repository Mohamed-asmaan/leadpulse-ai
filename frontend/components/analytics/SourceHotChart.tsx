"use client";

import type { SourceHotStat } from "@/lib/leadMetrics";

export function SourceHotChart({ rows }: { rows: SourceHotStat[] }) {
  const max = Math.max(1, ...rows.map((r) => r.hotRate));
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">Source performance (Hot rate)</h2>
        <p className="text-xs text-slate-500 mt-1">Which channels yield the highest-quality HOT leads in this snapshot.</p>
      </div>
      <div className="space-y-3">
        {rows.slice(0, 8).map((r) => (
          <div key={r.source}>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="truncate pr-2">{r.source}</span>
              <span className="tabular-nums text-slate-300 shrink-0">
                {r.hot}/{r.total} · {(r.hotRate * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500/70"
                style={{ width: `${(r.hotRate / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-xs text-slate-500">No source data.</p> : null}
      </div>
    </div>
  );
}
