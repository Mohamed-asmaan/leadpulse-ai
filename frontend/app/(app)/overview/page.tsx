"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Flame, Timer, Users } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import type { FunnelMetrics, Lead } from "@/lib/types";

export default function OverviewPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const slice = await apiFetch<Lead[]>(`/api/v1/leads?limit=8`);
        if (!cancelled) setLeads(slice);
        if (getRole() === "admin") {
          const f = await apiFetch<FunnelMetrics>(`/api/v1/analytics/funnel`);
          if (!cancelled) setFunnel(f);
        }
        if (!cancelled) setErr(null);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load overview");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Operations overview</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Real-time snapshot of pipeline health. The 5-minute response window is highlighted in Lead Management to
          reduce revenue leakage from delayed follow-up.
        </p>
      </div>

      {err ? <div className="text-sm text-rose-400 border border-rose-900/50 rounded-lg p-3">{err}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Users className="h-5 w-5 text-sky-400" />}
          label="Pipeline (sample)"
          value={String(leads.length)}
          hint="Recent rows from your RBAC scope (up to 8)"
        />
        <Kpi
          icon={<Flame className="h-5 w-5 text-rose-400" />}
          label="Hot leads (org)"
          value={funnel != null ? String(funnel.hot) : "—"}
          hint={getRole() === "admin" ? "Admin: org-wide" : "Admin-only KPI hidden"}
        />
        <Kpi
          icon={<Timer className="h-5 w-5 text-amber-300" />}
          label="Avg response"
          value={
            funnel?.avg_response_seconds == null
              ? "—"
              : `${(funnel.avg_response_seconds / 60).toFixed(1)} min`
          }
          hint="Automated first outreach latency"
        />
        <Kpi
          icon={<Activity className="h-5 w-5 text-emerald-400" />}
          label="Conversion proxy"
          value={funnel?.conversion_proxy_rate == null ? "—" : `${(funnel.conversion_proxy_rate * 100).toFixed(1)}%`}
          hint="Meeting-booked signal density"
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-200">Recent leads</h2>
          <Link href="/leads" className="text-xs text-sky-300 hover:underline">
            Open Lead Management →
          </Link>
        </div>
        <ul className="divide-y divide-slate-800">
          {leads.map((l) => (
            <li key={l.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-medium text-slate-100">{l.name}</div>
                <div className="text-xs text-slate-500">{l.source}</div>
              </div>
              <div className="text-right text-xs">
                <div className="text-slate-300 tabular-nums">Score {l.total_score ?? "—"}</div>
                <div className="text-slate-500 capitalize">{l.tier}</div>
              </div>
            </li>
          ))}
          {leads.length === 0 ? <li className="px-4 py-6 text-sm text-slate-500">No recent leads in your scope.</li> : null}
        </ul>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 flex gap-3">
      <div className="shrink-0 p-2 rounded-lg bg-slate-950 border border-slate-800">{icon}</div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-xl font-semibold text-slate-50 mt-1">{value}</div>
        <div className="text-[10px] text-slate-600 mt-1 leading-snug">{hint}</div>
      </div>
    </div>
  );
}
