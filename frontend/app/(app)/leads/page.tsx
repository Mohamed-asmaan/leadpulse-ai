"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { LeadsFiltersBar } from "@/components/leads/LeadsFiltersBar";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { buildApiQuery, defaultFilters, filterLeadsClient, type LeadListFilters } from "@/lib/leadsFilters";
import { MOCK_LEAD_POOL } from "@/lib/mockLeads";
import { getUseMockLeads } from "@/lib/preferences";
import { exportLeadsCsv } from "@/lib/exportReports";
import { useLeadsList } from "@/lib/hooks/useLeadsList";

export default function LeadsManagementPage() {
  const [filters, setFilters] = useState<LeadListFilters>(defaultFilters);
  const [mockMode, setMockMode] = useState(false);

  const queryString = useMemo(() => buildApiQuery(filters, 500), [filters]);

  const {
    data: apiLeads = [],
    error,
    isPending,
    isFetching,
  } = useLeadsList(queryString, {
    enabled: !mockMode,
    refetchInterval: 5000,
  });

  useEffect(() => {
    setMockMode(getUseMockLeads());
  }, []);

  useEffect(() => {
    const onPrefs = () => setMockMode(getUseMockLeads());
    window.addEventListener("lp-prefs-changed", onPrefs);
    return () => window.removeEventListener("lp-prefs-changed", onPrefs);
  }, []);

  const displayLeads = useMemo(() => {
    if (mockMode) return filterLeadsClient(MOCK_LEAD_POOL, filters);
    return apiLeads;
  }, [mockMode, filters, apiLeads]);

  const datasetLabel = mockMode
    ? "Mock universe · 1,200 synthetic leads · client-side filters + virtualization"
    : "Live API · RBAC-scoped · server-side filters (limit 500) · TanStack Query cache + 5s poll";

  const loading = !mockMode && isPending;

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        label="Lead desk"
        title="Lead management"
        description="High-density grid with filters, SLA columns, and score explainability — CRM-style operations without leaving LeadPulse’s capture→score→outreach spine."
        action={
          <Link
            href="/intelligence"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-violet-500/35 bg-violet-500/10 px-4 text-sm font-medium text-violet-900 dark:text-violet-100 hover:bg-violet-500/20"
          >
            <Sparkles className="h-4 w-4" />
            AI Studio
          </Link>
        }
      />
      <LeadsFiltersBar
        filters={filters}
        onChange={setFilters}
        datasetLabel={datasetLabel}
        onExportCsv={() => exportLeadsCsv(displayLeads, "leadpulse-leads-export.csv")}
      />

      {error && !mockMode ? (
        <div className="text-sm text-destructive border border-destructive/25 rounded-lg p-3">{error.message}</div>
      ) : null}
      {loading ? <div className="text-sm text-muted-foreground">Loading pipeline…</div> : null}
      {!mockMode && isFetching && !isPending ? (
        <div className="text-[11px] text-muted-foreground">Refreshing…</div>
      ) : null}

      {!loading || mockMode ? <LeadsTable leads={displayLeads} /> : null}
    </div>
  );
}
