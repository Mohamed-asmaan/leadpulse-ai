"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, FileText } from "lucide-react";

import { FunnelViz } from "@/components/analytics/FunnelViz";
import { LinearGauge } from "@/components/analytics/Gauge";
import { SourceHotChart } from "@/components/analytics/SourceHotChart";
import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { exportAnalyticsPdf } from "@/lib/exportReports";
import { exportLeadsCsv } from "@/lib/exportReports";
import {
  funnelFromLeads,
  scoringAccuracyProxy,
  sourceHotBreakdown,
} from "@/lib/leadMetrics";
import { MOCK_LEAD_POOL } from "@/lib/mockLeads";
import { getUseMockLeads } from "@/lib/preferences";
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
      <div className="p-6 max-w-lg mx-auto mt-10 rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-slate-300">
        {error}
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading analytics workspace…</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-rose-400">{error}</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Analytical reporting</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Funnel progression, SLA-oriented response telemetry, and channel quality diagnostics. Dataset respects the
            mock-data toggle in Settings for reproducible academic runs.
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
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => exportLeadsCsv(leads, "leadpulse-analytics-dataset.csv")}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelViz funnel={funnel} />
        <div className="space-y-4">
          {avgMin == null ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 text-xs text-slate-500">
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
          <p className="text-[10px] text-slate-600 leading-snug">{acc.note}</p>
        </div>
      </div>

      <SourceHotChart rows={sources} />
    </div>
  );
}
