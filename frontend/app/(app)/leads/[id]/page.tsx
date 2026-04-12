"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Flame } from "lucide-react";

import { EnrichmentCard } from "@/components/lead/EnrichmentCard";
import { LeadScorePanel } from "@/components/lead/LeadScorePanel";
import { TimelineVertical } from "@/components/lead/TimelineVertical";
import { VerificationPanel } from "@/components/lead/VerificationPanel";
import { InstantOutreachDrawer } from "@/components/leads/InstantOutreachDrawer";
import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import type { Lead, LeadEvent, UserRow } from "@/lib/types";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [lead, setLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<LeadEvent[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [assignee, setAssignee] = useState<string>("");

  const refresh = useCallback(async () => {
    const [l, t] = await Promise.all([
      apiFetch<Lead>(`/api/v1/leads/${id}`),
      apiFetch<LeadEvent[]>(`/api/v1/leads/${id}/timeline`),
    ]);
    setLead(l);
    setTimeline(t);
    setAssignee(l.assigned_to_id || "");
  }, [id]);

  useEffect(() => {
    setIsAdmin(getRole() === "admin");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
        if (getRole() === "admin") {
          const u = await apiFetch<UserRow[]>(`/api/v1/users`);
          if (!cancelled) setUsers(u);
        }
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load lead");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, refresh]);

  async function postEvent(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const channel = String(fd.get("channel") || "email");
    const event_type = String(fd.get("event_type") || "email_open");
    const summary = String(fd.get("summary") || "") || null;
    try {
      await apiFetch<Lead>(`/api/v1/leads/${id}/events`, {
        method: "POST",
        body: JSON.stringify({ channel, event_type, summary, payload: null }),
      });
      (e.target as HTMLFormElement).reset();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to append event");
    }
  }

  async function saveAssignee(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch<Lead>(`/api/v1/leads/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_to_id: assignee ? assignee : null }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    }
  }

  if (!lead) {
    return <div className="p-6 text-sm text-slate-500">{error || "Loading profile…"}</div>;
  }

  const hot = lead.tier === "hot";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" onClick={() => router.push("/leads")} className="text-xs text-slate-500 hover:text-slate-300">
            ← Lead Management
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50 mt-2">{lead.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {lead.email} · {lead.source}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hot ? (
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="inline-flex items-center gap-2 rounded-md bg-amber-500/15 border border-amber-500/40 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
            >
              <Flame className="h-4 w-4" />
              Instant outreach
            </button>
          ) : null}
          <div className="text-right text-sm border border-slate-800 rounded-lg px-3 py-2 bg-slate-900/40">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Tier</div>
            <div className="text-lg font-semibold capitalize text-slate-100">{lead.tier || "—"}</div>
            <div className="text-[10px] text-slate-500 mt-1">Score {lead.total_score ?? "—"}</div>
          </div>
        </div>
      </div>

      {error ? <div className="text-sm text-rose-400 border border-rose-900/40 rounded-lg p-3">{error}</div> : null}

      <details className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-sm">
        <summary className="cursor-pointer text-slate-300 font-medium">Capture audit (immutable payload)</summary>
        <div className="mt-3 space-y-2 text-xs text-slate-400">
          <div>
            <span className="text-slate-500">Channel:</span> {lead.capture_channel || "—"}
          </div>
          <div>
            <span className="text-slate-500">SHA-256 (canonical capture):</span>{" "}
            <code className="text-slate-300 break-all">{lead.integrity_sha256 || "—"}</code>
          </div>
          {lead.raw_capture_payload ? (
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-slate-950 p-2 text-[11px] leading-relaxed text-slate-400">
              {JSON.stringify(lead.raw_capture_payload, null, 2)}
            </pre>
          ) : null}
        </div>
      </details>

      {isAdmin ? (
        <form onSubmit={saveAssignee} className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 flex flex-wrap gap-3 items-end">
          <label className="text-xs text-slate-500 flex flex-col gap-1 min-w-[14rem]">
            Assign to sales
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-slate-200"
            >
              <option value="">Unassigned</option>
              {users
                .filter((u) => u.role === "sales")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" className="rounded-md bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-medium text-white">
            Save assignment
          </button>
        </form>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <EnrichmentCard lead={lead} />
        <LeadScorePanel lead={lead} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TimelineVertical events={timeline} />
        <VerificationPanel leadId={lead.id} />
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
        <h2 className="text-sm font-semibold text-slate-200">Log interaction</h2>
        <p className="text-xs text-slate-500 mt-1 mb-3">Append behavioral signals to refresh intent scoring.</p>
        <form onSubmit={postEvent} className="grid gap-3 sm:grid-cols-4 items-end">
          <input type="hidden" name="channel" value="email" />
          <label className="text-xs text-slate-500 flex flex-col gap-1">
            Event type
            <select name="event_type" className="rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-sm">
              <option value="email_open">Email opened</option>
              <option value="email_click">Email clicked</option>
              <option value="page_visit">Website visited</option>
              <option value="meeting_booked">Meeting booked</option>
            </select>
          </label>
          <label className="text-xs text-slate-500 flex flex-col gap-1 sm:col-span-2">
            Summary
            <input name="summary" className="rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-sm" placeholder="Optional note" />
          </label>
          <button type="submit" className="rounded-md border border-slate-700 bg-slate-950 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900">
            Append
          </button>
        </form>
      </section>

      <InstantOutreachDrawer lead={hot ? lead : null} open={drawer && hot} onClose={() => setDrawer(false)} />
    </div>
  );
}
