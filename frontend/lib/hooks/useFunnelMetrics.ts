"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { API_V1 } from "@/lib/apiPaths";
import { queryKeys } from "@/lib/queryKeys";
import type { FunnelMetrics } from "@/lib/types";

type FunnelOpts = Pick<UseQueryOptions<FunnelMetrics, Error>, "enabled">;

/** Org-wide funnel KPIs (admin API) — shared by Overview and Analytics. */
export function useFunnelMetrics(options?: FunnelOpts) {
  return useQuery({
    queryKey: queryKeys.analytics.funnel,
    queryFn: () => apiFetch<FunnelMetrics>(`${API_V1}/analytics/funnel`),
    enabled: options?.enabled ?? false,
    staleTime: 30_000,
  });
}
