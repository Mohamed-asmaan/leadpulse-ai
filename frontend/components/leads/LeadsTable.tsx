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

  return (
    <>
      <div
        ref={parentRef}
        className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-auto max-h-[calc(100vh-16rem)]"
      >
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[1.1fr_1.3fr_1fr_0.6fr_0.7fr_0.9fr_0.9fr_0.5fr] gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10">
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
                  className="absolute left-0 right-0 grid grid-cols-[1.1fr_1.3fr_1fr_0.6fr_0.7fr_0.9fr_0.9fr_0.5fr] gap-2 px-3 py-2 items-center border-b border-slate-900/80 text-sm hover:bg-slate-900/40"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="font-medium text-slate-100 truncate">{lead.name}</div>
                  <div className="text-slate-400 truncate text-xs">{lead.email}</div>
                  <div className="text-slate-400 truncate text-xs">{lead.source}</div>
                  <div className="text-right tabular-nums text-slate-200">{lead.total_score ?? "—"}</div>
                  <div>
                    <TierPill tier={lead.tier} />
                  </div>
                  <div className="text-xs text-slate-400 tabular-nums">{formatResponseTime(lead)}</div>
                  <div className="text-xs">
                    <SlaCell lead={lead} />
                  </div>
                  <div className="flex justify-end gap-1">
                    {hot ? (
                      <button
                        type="button"
                        title="Instant outreach"
                        onClick={() => setDrawerLead(lead)}
                        className="p-1.5 rounded-md border border-amber-900/60 bg-amber-950/40 text-amber-300 hover:bg-amber-950/70"
                      >
                        <Flame className="h-4 w-4" />
                      </button>
                    ) : null}
                    <Link
                      href={`/leads/${lead.id}`}
                      className="p-1.5 rounded-md border border-slate-800 text-slate-400 hover:text-sky-300 hover:border-slate-600"
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
      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
      : t === "warm"
        ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
        : t === "cold"
          ? "bg-slate-800 text-slate-300 border-slate-700"
          : "bg-slate-900 text-slate-500 border-slate-800";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {tier || "—"}
    </span>
  );
}
