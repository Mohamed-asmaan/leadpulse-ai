/**
 * Shared list query strings so TanStack Query dedupes identical requests
 * (Overview + AI Studio + any other consumer of the same slice).
 */
export const LEADS_DASHBOARD_QUERY = "?limit=60" as const;
