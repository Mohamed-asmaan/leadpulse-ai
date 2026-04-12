"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Flame, Timer, Users } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import type { FunnelMetrics, Lead } from "@/lib/types";

export default function OverviewPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
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
    }
    load();
    const t = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <PageHeader
        label="Command center"
        title="Operations overview"
        description="Real-time snapshot of pipeline health. The 5-minute response window is highlighted in Lead Management to reduce revenue leakage from delayed follow-up."
      />

      {err ? <div className="text-sm text-destructive border border-border rounded-lg p-3">{err}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Users className="h-5 w-5 text-primary" />}
          label="Pipeline (sample)"
          value={String(leads.length)}
          hint="Recent rows from your RBAC scope (up to 8)"
        />
        <Kpi
          icon={<Flame className="h-5 w-5 text-destructive" />}
          label="Hot leads (org)"
          value={funnel != null ? String(funnel.hot) : "—"}
          hint={getRole() === "admin" ? "Admin: org-wide" : "Admin-only KPI hidden"}
        />
        <Kpi
          icon={<Timer className="h-5 w-5 text-amber-800" />}
          label="Avg response"
          value={
            funnel?.avg_response_seconds == null
              ? "—"
              : `${(funnel.avg_response_seconds / 60).toFixed(1)} min`
          }
          hint="Automated first outreach latency"
        />
        <Kpi
          icon={<Activity className="h-5 w-5 text-emerald-700" />}
          label="Conversion proxy"
          value={funnel?.conversion_proxy_rate == null ? "—" : `${(funnel.conversion_proxy_rate * 100).toFixed(1)}%`}
          hint="Meeting-booked signal density"
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent leads</CardTitle>
          <Link href="/leads" className="text-xs text-primary hover:underline">
            Open Lead Management →
          </Link>
        </CardHeader>
        <ul className="divide-y divide-border">
          {leads.map((l) => (
            <li key={l.id} className="px-4 md:px-5 py-3 flex items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-medium text-foreground">{l.name}</div>
                <div className="text-xs text-muted-foreground">{l.source}</div>
              </div>
              <div className="text-right text-xs">
                <div className="text-foreground tabular-nums">Score {l.total_score ?? "—"}</div>
                <div className="text-muted-foreground capitalize">{l.tier}</div>
              </div>
            </li>
          ))}
          {leads.length === 0 ? (
            <li className="px-4 py-8 space-y-3">
              <p className="text-sm text-muted-foreground">
                No leads in your scope yet. Capture from the console or wire a webhook.
              </p>
              <Link
                href="/capture"
                className="inline-flex rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-semibold"
              >
                Go to Capture
              </Link>
            </li>
          ) : null}
        </ul>
      </Card>
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
    <div className="rounded-xl border border-border bg-card p-4 flex gap-3 shadow-sm">
      <div className="shrink-0 p-2 rounded-lg bg-muted/50 border border-border">{icon}</div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold text-foreground mt-1">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-1 leading-snug">{hint}</div>
      </div>
    </div>
  );
}
