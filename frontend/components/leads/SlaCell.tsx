"use client";

import { useEffect, useState } from "react";

import { formatDurationSeconds, secondsSinceCaptured, slaBreached } from "@/lib/leadMetrics";
import type { Lead } from "@/lib/types";

export function SlaCell({ lead }: { lead: Lead }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const elapsed = secondsSinceCaptured(lead.created_at, now);
  const breached = slaBreached(lead.created_at, now, lead.first_outreach_at);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="tabular-nums text-foreground">{formatDurationSeconds(elapsed)}</span>
      {breached ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">SLA over 5m</span>
      ) : lead.first_outreach_at ? (
        <span className="text-[10px] text-emerald-700/90">Responded</span>
      ) : (
        <span className="text-[10px] text-muted-foreground">Within SLA</span>
      )}
    </div>
  );
}
