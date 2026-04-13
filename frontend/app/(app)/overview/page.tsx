"use client";

import Link from "next/link";
import { Activity, Flame, Timer, Users } from "lucide-react";

import { AiAutomationAssistant } from "@/components/ai/AiAutomationAssistant";
import { KpiStat } from "@/components/dashboard/KpiStat";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LEADS_DASHBOARD_QUERY } from "@/lib/constants/dataFetch";
import { useFunnelMetrics } from "@/lib/hooks/useFunnelMetrics";
import { useLeadsList } from "@/lib/hooks/useLeadsList";
import { getRole } from "@/lib/auth";

export default function OverviewPage() {
  const isAdmin = getRole() === "admin";
  const {
    data: leadsAll = [],
    error: leadsError,
    isPending: leadsPending,
  } = useLeadsList(LEADS_DASHBOARD_QUERY, { refetchInterval: 5000 });
  const { data: funnel, error: funnelError } = useFunnelMetrics({ enabled: isAdmin });

  const leadsPreview = leadsAll.slice(0, 8);
  const err = leadsError?.message ?? funnelError?.message ?? null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <PageHeader
        label="Command center"
        title="Operations overview"
        description="Real-time snapshot of pipeline health. LeadPulse AI scores and automates outreach in the background — open AI Studio for prioritized actions and per-lead explainability."
      />

      {err ? <div className="text-sm text-destructive border border-border rounded-lg p-3">{err}</div> : null}

      <AiAutomationAssistant leads={leadsAll} isAdmin={isAdmin} compact />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStat
          icon={<Users className="h-5 w-5 text-primary" />}
          label="Pipeline (cached pull)"
          value={String(leadsAll.length)}
          hint="Up to 100 leads shared with AI Studio (TanStack Query cache)"
        />
        <KpiStat
          icon={<Flame className="h-5 w-5 text-destructive" />}
          label="Hot leads (org)"
          value={funnel != null ? String(funnel.hot) : "—"}
          hint={isAdmin ? "Admin: org-wide" : "Admin-only KPI hidden"}
        />
        <KpiStat
          icon={<Timer className="h-5 w-5 text-amber-800" />}
          label="Avg response"
          value={
            funnel?.avg_response_seconds == null ? "—" : `${(funnel.avg_response_seconds / 60).toFixed(1)} min`
          }
          hint="Automated first outreach latency"
        />
        <KpiStat
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
          {leadsPending && leadsPreview.length === 0 ? (
            <li className="px-4 py-8 text-sm text-muted-foreground">Loading…</li>
          ) : null}
          {leadsPreview.map((l) => (
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
          {!leadsPending && leadsPreview.length === 0 ? (
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
