"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { API_V1 } from "@/lib/apiPaths";
import { queryKeys } from "@/lib/queryKeys";
import type { UserRow } from "@/lib/types";

/** Sales directory for assignment UI — changes rarely, long stale window. */
export function useUsersList(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.users.list,
    queryFn: () => apiFetch<UserRow[]>(`${API_V1}/users`),
    enabled,
    staleTime: 120_000,
  });
}
