"use client";

import { keepPreviousData, useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { API_V1 } from "@/lib/apiPaths";
import { queryKeys } from "@/lib/queryKeys";
import type { Lead } from "@/lib/types";

type LeadsListOpts = Pick<UseQueryOptions<Lead[], Error>, "enabled" | "refetchInterval">;

/**
 * Cached lead list; `queryString` must start with `?` (e.g. `?limit=100`).
 * Overview + AI Studio share the same key when queryString matches.
 */
export function useLeadsList(queryString: string, options?: LeadsListOpts) {
  return useQuery({
    queryKey: queryKeys.leads.list(queryString),
    queryFn: () => apiFetch<Lead[]>(`${API_V1}/leads${queryString}`),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? false,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
