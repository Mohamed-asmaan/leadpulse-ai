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
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-amber-400" />
            Instant outreach
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-md hover:bg-slate-900 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
          <div className="text-xs text-slate-500">
            Hot leads should receive automated outreach in under 60 seconds. This panel surfaces the latest system
            dispatch plus a deterministic preview template.
          </div>
          {err ? <div className="text-xs text-rose-400">{err}</div> : null}
          {latest ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">Latest {latest.channel}</div>
              <div className="font-medium text-slate-200">{latest.subject}</div>
              <pre className="whitespace-pre-wrap text-xs text-slate-300 leading-relaxed">{latest.message}</pre>
              <div className="text-[10px] text-slate-600">{new Date(latest.created_at).toLocaleString()}</div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">No automated outreach log yet for this lead.</div>
          )}
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-3 space-y-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">Template preview</div>
            <div className="font-medium text-slate-200">{preview.subject}</div>
            <pre className="whitespace-pre-wrap text-xs text-slate-300 leading-relaxed">{preview.body}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
