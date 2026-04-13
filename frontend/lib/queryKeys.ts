/**
 * Stable TanStack Query keys — dedupe network work and enable targeted invalidation.
 * Always use these factories instead of inline string arrays.
 */
export const queryKeys = {
  leads: {
    all: ["leads"] as const,
    /** Full query string including `?`, e.g. `?limit=100` or `?limit=500&tier=hot` */
    list: (queryString: string) => ["leads", "list", queryString] as const,
    workspace: (leadId: string) => ["leads", "workspace", leadId] as const,
  },
  analytics: {
    funnel: ["analytics", "funnel"] as const,
  },
  integrations: {
    bundle: ["integrations", "bundle"] as const,
  },
  users: {
    list: ["users", "list"] as const,
  },
} as const;
