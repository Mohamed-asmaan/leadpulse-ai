"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { LeadWorkspace } from "@/components/lead/LeadWorkspace";
import { InstantOutreachDrawer } from "@/components/leads/InstantOutreachDrawer";
import { useFlash } from "@/components/layout/FlashContext";
import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import { useLeadWorkspace } from "@/lib/hooks/useLeadWorkspace";
import { useUsersList } from "@/lib/hooks/useUsersList";
import { queryKeys } from "@/lib/queryKeys";
import { API_V1 } from "@/lib/apiPaths";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const raw = params.id;
  const id = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] ?? "" : "";
  const { flash } = useFlash();
  const qc = useQueryClient();

  const [drawer, setDrawer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error: loadError, isPending } = useLeadWorkspace(id || undefined);
  const { data: users = [] } = useUsersList(isAdmin);

  useEffect(() => {
    setIsAdmin(getRole() === "admin");
  }, []);

  useEffect(() => {
    if (data?.lead) setAssignee(data.lead.assigned_to_id || "");
  }, [data?.lead]);

  async function postEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const channel = String(fd.get("channel") || "email");
    const event_type = String(fd.get("event_type") || "email_open");
    const summary = String(fd.get("summary") || "") || null;
    try {
      await apiFetch(`${API_V1}/leads/${id}/events`, {
        method: "POST",
        body: JSON.stringify({ channel, event_type, summary, payload: null }),
      });
      (e.target as HTMLFormElement).reset();
      await qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      setActionError(null);
      flash("Timeline event recorded; score may update on next recompute.", "success");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to append event");
      flash("Could not append event.", "error");
    }
  }

  async function saveAssignee(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await apiFetch(`${API_V1}/leads/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_to_id: assignee ? assignee : null }),
      });
      await qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      setActionError(null);
      flash("Assignment saved.", "success");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to assign");
      flash("Assignment failed.", "error");
    }
  }

  const errMsg = loadError?.message ?? actionError;
  const lead = data?.lead;

  if (!id) {
    return <div className="p-6 text-sm text-destructive">Invalid lead URL.</div>;
  }

  if (isPending && !lead) {
    return <div className="p-6 text-sm text-muted-foreground">Loading profile…</div>;
  }

  if (!lead) {
    return <div className="p-6 text-sm text-destructive">{errMsg || "Lead not found."}</div>;
  }

  const hot = lead.tier === "hot";

  return (
    <div className="p-4 md:p-6">
      <LeadWorkspace
        lead={lead}
        timeline={data?.timeline ?? []}
        outreach={data?.outreach ?? []}
        error={errMsg}
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
