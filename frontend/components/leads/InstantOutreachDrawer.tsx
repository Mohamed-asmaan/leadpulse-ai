"use client";

import { useEffect, useState } from "react";
import { X, Zap } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { buildOutreachPreview } from "@/lib/outreachPreview";
import type { Lead, OutreachRow } from "@/lib/types";

type Props = {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
};

export function InstantOutreachDrawer({ lead, open, onClose }: Props) {
  const [rows, setRows] = useState<OutreachRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !lead) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<OutreachRow[]>(`/api/v1/leads/${lead.id}/outreach`);
        if (!cancelled) {
          setRows(data);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load outreach");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, lead]);

  if (!open || !lead) return null;

  const preview = buildOutreachPreview(lead);
  const latest = rows[0];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button type="button" className="absolute inset-0 bg-foreground/35" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-amber-600" />
            Instant outreach
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-md hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
          <div className="text-xs text-muted-foreground">
            Hot leads should receive automated outreach in under 60 seconds. This panel surfaces the latest system
            dispatch plus a deterministic preview template.
          </div>
          {err ? <div className="text-xs text-destructive">{err}</div> : null}
          {latest ? (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Latest {latest.channel}</div>
              <div className="font-medium text-foreground">{latest.subject}</div>
              <pre className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">{latest.message}</pre>
              <div className="text-[10px] text-muted-foreground">{new Date(latest.created_at).toLocaleString()}</div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No automated outreach log yet for this lead.</div>
          )}
          <div className="rounded-lg border border-dashed border-border bg-muted/70 p-3 space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Template preview</div>
            <div className="font-medium text-foreground">{preview.subject}</div>
            <pre className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">{preview.body}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
