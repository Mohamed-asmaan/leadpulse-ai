"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { API_V1 } from "@/lib/apiPaths";
import { queryKeys } from "@/lib/queryKeys";
import type { AutomationWorkflow, IntegrationStatus } from "@/lib/types";

export type IntegrationBundle = {
  status: IntegrationStatus;
  workflows: AutomationWorkflow[];
};

/** Single round-trip shape for Integrations UI (status + workflow catalog). */
export function useIntegrationBundle() {
  return useQuery({
    queryKey: queryKeys.integrations.bundle,
    queryFn: async (): Promise<IntegrationBundle> => {
      const [status, workflows] = await Promise.all([
        apiFetch<IntegrationStatus>(`${API_V1}/integrations/status`),
        apiFetch<AutomationWorkflow[]>(`${API_V1}/integrations/workflows`),
      ]);
      return { status, workflows };
    },
    staleTime: 60_000,
  });
}
