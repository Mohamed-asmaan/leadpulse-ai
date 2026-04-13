"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        gcTime: 10 * 60_000,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  });
}

/**
 * One QueryClient per browser session (Next.js App Router safe pattern).
 * Tunes defaults for CRM-style dashboards: short stale window, longer garbage collection.
 */
export function AppQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
