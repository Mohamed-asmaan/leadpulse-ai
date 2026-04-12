"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { LeadsFiltersBar } from "@/components/leads/LeadsFiltersBar";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiFetch } from "@/lib/api";
import { buildApiQuery, defaultFilters, filterLeadsClient, type LeadListFilters } from "@/lib/leadsFilters";
import { MOCK_LEAD_POOL } from "@/lib/mockLeads";
import { getUseMockLeads } from "@/lib/preferences";
import { exportLeadsCsv } from "@/lib/exportReports";
import type { Lead } from "@/lib/types";

export default function LeadsManagementPage() {
  const [filters, setFilters] = useState<LeadListFilters>(defaultFilters);
  const [apiLeads, setApiLeads] = useState<Lead[]>([]);
  const [mockMode, setMockMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshApi = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Lead[]>(`/api/v1/leads${buildApiQuery(filters, 500)}`);
      setApiLeads(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
      setLoading(false);
      return;
    }
    refreshApi();
    const t = window.setInterval(() => refreshApi(), 5000);
    return () => window.clearInterval(t);
  }, [mockMode, refreshApi]);

  const displayLeads = useMemo(() => {
    if (mockMode) return filterLeadsClient(MOCK_LEAD_POOL, filters);
    return apiLeads;
  }, [mockMode, filters, apiLeads]);

  const datasetLabel = mockMode
    ? "Mock universe · 1,200 synthetic leads · client-side filters + virtualization"
    : "Live API · RBAC-scoped · server-side filters (limit 500)";

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        label="Lead desk"
        title="Lead management"
        description="High-density grid with filters, SLA columns, and score explainability — CRM-style operations without leaving LeadPulse’s capture→score→outreach spine."
      />
      <LeadsFiltersBar
        filters={filters}
        onChange={setFilters}
        datasetLabel={datasetLabel}
        onExportCsv={() => exportLeadsCsv(displayLeads, "leadpulse-leads-export.csv")}
      />

      {error ? <div className="text-sm text-destructive border border-destructive/25 rounded-lg p-3">{error}</div> : null}
      {loading ? <div className="text-sm text-muted-foreground">Loading pipeline…</div> : null}

      {!loading || mockMode ? <LeadsTable leads={displayLeads} /> : null}
    </div>
  );
}
