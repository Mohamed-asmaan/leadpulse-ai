"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, Snowflake, ThermometerSun } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { MOCK_LEAD_POOL } from "@/lib/mockLeads";
import { getUseMockLeads } from "@/lib/preferences";
import type { Lead } from "@/lib/types";

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [mockMode, setMockMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Lead[]>(`/api/v1/leads?limit=500`);
      setLeads(data);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMockMode(getUseMockLeads());
  }, []);

  useEffect(() => {
    const onPrefs = () => setMockMode(getUseMockLeads());
    window.addEventListener("lp-prefs-changed", onPrefs);
    return () => window.removeEventListener("lp-prefs-changed", onPrefs);
  }, []);

  useEffect(() => {
    if (mockMode) {
      setLeads(MOCK_LEAD_POOL);
      setLoading(false);
      return;
    }
    void refresh();
    const t = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(t);
  }, [mockMode, refresh]);

  const columns = useMemo(() => {
    const hot: Lead[] = [];
    const warm: Lead[] = [];
    const cold: Lead[] = [];
    for (const l of leads) {
      const t = (l.tier || "cold").toLowerCase();
      if (t === "hot") hot.push(l);
      else if (t === "warm") warm.push(l);
      else cold.push(l);
    }
    return { hot, warm, cold };
  }, [leads]);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        label="Sales motion"
        title="Lead tier pipeline"
        description="Kanban-style triage inspired by Open Mercato deal boards — here each card is a scored lead (Hot / Warm / Cold) for response prioritization, not commerce orders."
      />

      {mockMode ? (
        <p className="text-xs text-amber-900 border border-amber-200 rounded-lg px-3 py-2 bg-amber-50">
          Mock dataset enabled in Settings — columns show synthetic distribution.
        </p>
      ) : null}

      {err ? <div className="text-sm text-destructive border border-border rounded-lg p-3">{err}</div> : null}
      {loading && !mockMode ? <p className="text-sm text-muted-foreground">Loading board…</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <PipelineColumn
          title="Hot"
          icon={<Flame className="h-4 w-4 text-destructive" />}
          leads={columns.hot}
          accent="border-rose-200 bg-rose-50/80"
        />
        <PipelineColumn
          title="Warm"
          icon={<ThermometerSun className="h-4 w-4 text-amber-400" />}
          leads={columns.warm}
          accent="border-amber-200 bg-amber-50/80"
        />
        <PipelineColumn
          title="Cold"
          icon={<Snowflake className="h-4 w-4 text-muted-foreground" />}
          leads={columns.cold}
          accent="border-border bg-muted/10"
        />
      </div>
    </div>
  );
}

function PipelineColumn({
  title,
  icon,
  leads,
  accent,
}: {
  title: string;
  icon: ReactNode;
  leads: Lead[];
  accent: string;
}) {
  return (
    <Card className={`flex flex-col min-h-[420px] ${accent}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          {icon}
          <span>
            {title}{" "}
            <span className="text-muted-foreground font-normal">({leads.length})</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
        {leads.length === 0 ? (
          <EmptyState title={`No ${title.toLowerCase()} leads`} description="Scores and tiers update as enrichment and engagement signals land." />
        ) : (
          leads.map((l) => (
            <Link
              key={l.id}
              href={`/leads/${l.id}`}
              className="block rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-accent/20 transition-colors"
            >
              <div className="font-medium text-sm text-foreground">{l.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{l.company || l.email}</div>
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span className="truncate max-w-[65%]">{l.source}</span>
                <span className="tabular-nums text-foreground">{l.total_score ?? "—"}</span>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
