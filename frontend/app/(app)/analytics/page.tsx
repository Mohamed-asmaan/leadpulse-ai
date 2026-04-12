"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileDown, FileText } from "lucide-react";

import { FunnelViz } from "@/components/analytics/FunnelViz";
import { LinearGauge } from "@/components/analytics/Gauge";
import { SourceHotChart } from "@/components/analytics/SourceHotChart";
import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { getUseMockLeads } from "@/lib/preferences";
import { exportAnalyticsPdf } from "@/lib/exportReports";
import { exportLeadsCsv } from "@/lib/exportReports";
import {
  funnelFromLeads,
  scoringAccuracyProxy,
  sourceHotBreakdown,
} from "@/lib/leadMetrics";
import { MOCK_LEAD_POOL } from "@/lib/mockLeads";
import type { FunnelMetrics, Lead } from "@/lib/types";

export default function AnalyticsPage() {
  const role = getRole();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funnelApi, setFunnelApi] = useState<FunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefsKey, setPrefsKey] = useState(0);

  useEffect(() => {
    const onPrefs = () => setPrefsKey((k) => k + 1);
    window.addEventListener("lp-prefs-changed", onPrefs);
    return () => window.removeEventListener("lp-prefs-changed", onPrefs);
  }, []);

  useEffect(() => {
    if (role !== "admin") {
      setLoading(false);
      setError("Analytics and org-wide exports are restricted to administrators.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const useMock = getUseMockLeads();
        const leadRows = useMock
          ? MOCK_LEAD_POOL
          : await apiFetch<Lead[]>(`/api/v1/leads?limit=500`);
        const f = await apiFetch<FunnelMetrics>(`/api/v1/analytics/funnel`);
        if (!cancelled) {
          setLeads(leadRows);
          setFunnelApi(f);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, prefsKey]);

  const funnel = useMemo(() => funnelFromLeads(leads), [leads]);
  const sources = useMemo(() => sourceHotBreakdown(leads), [leads]);
  const acc = useMemo(() => scoringAccuracyProxy(leads), [leads]);

  const avgMin = funnelApi?.avg_response_seconds == null ? null : funnelApi.avg_response_seconds / 60;

  if (role !== "admin") {
    return (
      <div className="p-6 max-w-lg mx-auto mt-10 rounded-xl border border-border bg-muted/50 text-sm text-foreground">
        {error}
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading analytics workspace…</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-destructive">{error}</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytical reporting</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Funnel and channel metrics are computed from <span className="text-muted-foreground">real leads in Postgres</span>{" "}
            (or the optional mock toggle in Settings). Scores use the same backend as lead detail: ICP fit, timeline
            intent, and a small logistic model for the predictive dimension.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              exportAnalyticsPdf({
                funnel,
                sources,
                avgResponseSec: funnelApi?.avg_response_seconds ?? null,
                accuracyProxy: acc.value,
                accuracyNote: acc.note,
              })
            }
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => exportLeadsCsv(leads, "leadpulse-analytics-dataset.csv")}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {leads.length === 0 && !getUseMockLeads() ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-100/90 flex flex-wrap items-center justify-between gap-3">
          <span>No lead rows yet — analytics will stay at zero until you capture data.</span>
          <Link href="/capture" className="text-amber-900 font-semibold hover:underline shrink-0">
            Capture →
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelViz funnel={funnel} />
        <div className="space-y-4">
          {avgMin == null ? (
            <div className="rounded-xl border border-border bg-muted/40 p-5 text-xs text-muted-foreground">
              Average response time: no outreach timestamps yet (requires at least one automated dispatch).
            </div>
          ) : (
            <LinearGauge
              label="Average response time"
              value={avgMin}
              max={15}
              format={(v) => `${v.toFixed(2)} min`}
              goodIfUnder
              threshold={5}
            />
          )}
          <LinearGauge
            label="Scoring accuracy (proxy)"
            value={acc.value}
            max={100}
            format={(v) => `${v.toFixed(1)}%`}
            goodIfUnder={false}
            threshold={85}
          />
          <p className="text-[10px] text-muted-foreground leading-snug">{acc.note}</p>
        </div>
      </div>

      <SourceHotChart rows={sources} />
    </div>
  );
}
