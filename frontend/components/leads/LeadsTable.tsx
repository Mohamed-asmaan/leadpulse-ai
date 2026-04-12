"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ExternalLink, Flame } from "lucide-react";

import { formatResponseTime } from "@/lib/leadMetrics";
import type { Lead } from "@/lib/types";

import { InstantOutreachDrawer } from "./InstantOutreachDrawer";
import { SlaCell } from "./SlaCell";

type Props = {
  leads: Lead[];
};

export function LeadsTable({ leads }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: leads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  const items = useMemo(() => leads, [leads]);

  if (items.length === 0) {
    return (
      <>
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center space-y-4">
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            No leads in this view. Capture a real lead to run the live pipeline (dedupe → enrichment → scoring →
            outreach log), or enable the mock dataset in Settings only for UI demos.
          </p>
          <Link
            href="/capture"
            className="inline-flex rounded-md bg-primary hover:bg-primary/90 px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Open Capture
          </Link>
        </div>
        <InstantOutreachDrawer lead={drawerLead} open={!!drawerLead} onClose={() => setDrawerLead(null)} />
      </>
    );
  }

  return (
    <>
      <div
        ref={parentRef}
        className="rounded-xl border border-border bg-muted/30 overflow-auto max-h-[calc(100vh-16rem)]"
      >
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[1.1fr_1.3fr_1fr_0.6fr_0.7fr_0.9fr_0.9fr_0.5fr] gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/95 sticky top-0 z-10">
            <div>Name</div>
            <div>Email</div>
            <div>Source</div>
            <div className="text-right">AI score</div>
            <div>Status</div>
            <div>Response</div>
            <div>Since capture</div>
            <div />
          </div>
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const lead = items[virtualRow.index]!;
              const hot = lead.tier === "hot";
              return (
                <div
                  key={lead.id}
                  className="absolute left-0 right-0 grid grid-cols-[1.1fr_1.3fr_1fr_0.6fr_0.7fr_0.9fr_0.9fr_0.5fr] gap-2 px-3 py-2 items-center border-b border-border/80 text-sm hover:bg-muted/50"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="font-medium text-foreground truncate">{lead.name}</div>
                  <div className="text-muted-foreground truncate text-xs">{lead.email}</div>
                  <div className="text-muted-foreground truncate text-xs">{lead.source}</div>
                  <div className="text-right tabular-nums text-foreground">{lead.total_score ?? "—"}</div>
                  <div>
                    <TierPill tier={lead.tier} />
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">{formatResponseTime(lead)}</div>
                  <div className="text-xs">
                    <SlaCell lead={lead} />
                  </div>
                  <div className="flex justify-end gap-1">
                    {hot ? (
                      <button
                        type="button"
                        title="Instant outreach"
                        onClick={() => setDrawerLead(lead)}
                        className="p-1.5 rounded-md border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                      >
                        <Flame className="h-4 w-4" />
                      </button>
                    ) : null}
                    <Link
                      href={`/leads/${lead.id}`}
                      className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-primary hover:border-muted-foreground/40"
                      title="Open profile"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <InstantOutreachDrawer lead={drawerLead} open={!!drawerLead} onClose={() => setDrawerLead(null)} />
    </>
  );
}

function TierPill({ tier }: { tier: string | null | undefined }) {
  const t = (tier || "—").toLowerCase();
  const cls =
    t === "hot"
      ? "bg-rose-50 text-rose-800 border-rose-200"
      : t === "warm"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : t === "cold"
          ? "bg-muted text-foreground border-border"
          : "bg-card text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {tier || "—"}
    </span>
  );
}
