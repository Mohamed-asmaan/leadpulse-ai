"use client";

import type { Query } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { API_V1 } from "@/lib/apiPaths";
import { queryKeys } from "@/lib/queryKeys";
import type { Lead, LeadEvent, OutreachRow } from "@/lib/types";

export type LeadWorkspaceData = {
  lead: Lead;
  timeline: LeadEvent[];
  outreach: OutreachRow[];
};

function scoringPollInterval(query: Query<LeadWorkspaceData, Error>): number | false {
  const d = query.state.data;
  if (!d?.lead) return false;
  if (d.lead.total_score == null && d.lead.scored_at == null) return 5000;
  return false;
}

/** Lead header + timeline + outreach with cache + targeted poll while pipeline scores. */
export function useLeadWorkspace(leadId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leads.workspace(leadId ?? ""),
    queryFn: async (): Promise<LeadWorkspaceData> => {
      const id = leadId as string;
      const [lead, timeline, outreach] = await Promise.all([
        apiFetch<Lead>(`${API_V1}/leads/${id}`),
        apiFetch<LeadEvent[]>(`${API_V1}/leads/${id}/timeline`),
        apiFetch<OutreachRow[]>(`${API_V1}/leads/${id}/outreach`),
      ]);
      return { lead, timeline, outreach };
    },
    enabled: Boolean(leadId),
    refetchInterval: scoringPollInterval,
  });
}
