"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";

import { LeadWorkspace } from "@/components/lead/LeadWorkspace";
import { InstantOutreachDrawer } from "@/components/leads/InstantOutreachDrawer";
import { useFlash } from "@/components/layout/FlashContext";
import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import type { Lead, LeadEvent, OutreachRow, UserRow } from "@/lib/types";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { flash } = useFlash();

  const [lead, setLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<LeadEvent[]>([]);
  const [outreach, setOutreach] = useState<OutreachRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [assignee, setAssignee] = useState<string>("");

  const refresh = useCallback(async () => {
    const [l, t, o] = await Promise.all([
      apiFetch<Lead>(`/api/v1/leads/${id}`),
      apiFetch<LeadEvent[]>(`/api/v1/leads/${id}/timeline`),
      apiFetch<OutreachRow[]>(`/api/v1/leads/${id}/outreach`),
    ]);
    setLead(l);
    setTimeline(t);
    setOutreach(o);
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

  useEffect(() => {
    const t = window.setInterval(() => {
      void refresh().catch(() => {});
    }, 5000);
    return () => window.clearInterval(t);
  }, [refresh]);

  async function postEvent(e: FormEvent<HTMLFormElement>) {
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
      flash("Timeline event recorded; score may update on next recompute.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to append event");
      flash("Could not append event.", "error");
    }
  }

  async function saveAssignee(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await apiFetch<Lead>(`/api/v1/leads/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_to_id: assignee ? assignee : null }),
      });
      await refresh();
      flash("Assignment saved.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
      flash("Assignment failed.", "error");
    }
  }

  if (!lead) {
    return <div className="p-6 text-sm text-muted-foreground">{error || "Loading profile…"}</div>;
  }

  const hot = lead.tier === "hot";

  return (
    <div className="p-4 md:p-6">
      <LeadWorkspace
        lead={lead}
        timeline={timeline}
        outreach={outreach}
        error={error}
        isAdmin={isAdmin}
        users={users}
        assignee={assignee}
        setAssignee={setAssignee}
        onSaveAssign={saveAssignee}
        onPostEvent={postEvent}
        onOpenOutreach={() => setDrawer(true)}
      />
      <InstantOutreachDrawer lead={hot ? lead : null} open={drawer && hot} onClose={() => setDrawer(false)} />
    </div>
  );
}
