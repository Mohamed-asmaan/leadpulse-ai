"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";

import { EnrichmentCard } from "@/components/lead/EnrichmentCard";
import { LeadScorePanel } from "@/components/lead/LeadScorePanel";
import { OutreachHistoryList } from "@/components/lead/OutreachHistoryList";
import { TimelineVertical } from "@/components/lead/TimelineVertical";
import { VerificationPanel } from "@/components/lead/VerificationPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Badge } from "@/components/ui/Badge";
import type { Lead, LeadEvent, OutreachRow, UserRow } from "@/lib/types";

const TABS = [
  { id: "overview" as const, label: "Overview" },
  { id: "intelligence" as const, label: "AI & scores" },
  { id: "activity" as const, label: "Activity" },
  { id: "security" as const, label: "Security & audit" },
];

type TabId = (typeof TABS)[number]["id"];

export function LeadWorkspace({
  lead,
  timeline,
  outreach,
  error,
  isAdmin,
  users,
  assignee,
  setAssignee,
  onSaveAssign,
  onPostEvent,
  onOpenOutreach,
}: {
  lead: Lead;
  timeline: LeadEvent[];
  outreach: OutreachRow[];
  error: string | null;
  isAdmin: boolean;
  users: UserRow[];
  assignee: string;
  setAssignee: (v: string) => void;
  onSaveAssign: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onPostEvent: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onOpenOutreach: () => void;
}) {
  const router = useRouter();
  /** Default to AI tab so scoring / ML explainability is visible without an extra click (Zoho-style intelligence first). */
  const [tab, setTab] = useState<TabId>("intelligence");
  const hot = lead.tier === "hot";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {lead.total_score == null && lead.scored_at == null ? (
        <Notice variant="info">
          Pipeline running (enrich → score → automation). This page refreshes every 5s until scores appear.
        </Notice>
      ) : null}

      <PageHeader
        label="Lead workspace"
        title={lead.name}
        description={`${lead.email} · ${lead.source}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {hot ? (
              <Button
                variant="default"
                className="bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                onClick={onOpenOutreach}
              >
                <Flame className="h-4 w-4" />
                Instant outreach
              </Button>
            ) : null}
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tier</div>
              <div className="text-lg font-semibold capitalize text-foreground">{lead.tier || "N/A"}</div>
              <div className="text-[10px] text-muted-foreground">Score {lead.total_score ?? "N/A"}</div>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              "px-3 py-2 text-sm font-medium rounded-t-md border border-b-0 transition-colors " +
              (tab === t.id
                ? "border-border bg-card text-foreground border-b-card relative z-[1] mb-[-1px]"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <div className="text-sm text-destructive border border-border rounded-lg p-3">{error}</div> : null}

      <button
        type="button"
        onClick={() => router.push("/leads")}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Lead Management
      </button>

      {tab === "overview" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{lead.capture_channel || "capture"}</Badge>
            {lead.enrichment_provider ? <Badge variant="success">Enriched</Badge> : null}
            {lead.first_outreach_at ? <Badge variant="warning">Outreach started</Badge> : null}
          </div>
          {isAdmin ? (
            <form
              onSubmit={onSaveAssign}
              className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-3 items-end"
            >
              <label className="text-xs text-muted-foreground flex flex-col gap-1 min-w-[14rem]">
                Assign to sales
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
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
              <Button type="submit" className="bg-primary text-primary-foreground">
                Save assignment
              </Button>
            </form>
          ) : null}
          <Notice variant="default">
            The <strong className="text-foreground">AI & scores</strong> tab is the default: composite scoring, ML blend
            summary, and explainable reasons from the API. Use <strong className="text-foreground">Activity</strong> to
            log opens and visits so the AI engagement layer updates.
          </Notice>
        </div>
      ) : null}

      {tab === "intelligence" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <EnrichmentCard lead={lead} />
          <LeadScorePanel lead={lead} />
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Unified timeline</h3>
            <TimelineVertical events={timeline} />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Automated outreach</h3>
            <OutreachHistoryList rows={outreach} />
            <section className="rounded-xl border border-border bg-card p-5">
              <h4 className="text-sm font-semibold text-foreground">Log interaction</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Append behavioral signals to refresh engagement scoring.</p>
              <form onSubmit={onPostEvent} className="grid gap-3 sm:grid-cols-2 items-end">
                <input type="hidden" name="channel" value="email" />
                <label className="text-xs text-muted-foreground flex flex-col gap-1">
                  Event type
                  <select name="event_type" className="rounded-md border border-border bg-background px-2 py-2 text-sm">
                    <option value="email_open">Email opened</option>
                    <option value="email_click">Email clicked</option>
                    <option value="page_visit">Website visited</option>
                    <option value="meeting_booked">Meeting booked</option>
                  </select>
                </label>
                <label className="text-xs text-muted-foreground flex flex-col gap-1">
                  Summary
                  <input
                    name="summary"
                    className="rounded-md border border-border bg-background px-2 py-2 text-sm"
                    placeholder="Optional note"
                  />
                </label>
                <Button type="submit" variant="outline" className="sm:col-span-2 w-full sm:w-auto">
                  Append to timeline
                </Button>
              </form>
            </section>
          </div>
        </div>
      ) : null}

      {tab === "security" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <VerificationPanel leadId={lead.id} />
          <details className="rounded-xl border border-border bg-card p-4 text-sm">
            <summary className="cursor-pointer text-foreground font-medium">Capture audit (immutable payload)</summary>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <div>
                <span className="text-muted-foreground/80">Channel:</span> {lead.capture_channel || "N/A"}
              </div>
              <div>
                <span className="text-muted-foreground/80">SHA-256 (canonical capture):</span>{" "}
                <code className="text-foreground break-all">{lead.integrity_sha256 || "N/A"}</code>
              </div>
              {lead.raw_capture_payload ? (
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted/70 p-2 text-[11px] leading-relaxed">
                  {JSON.stringify(lead.raw_capture_payload, null, 2)}
                </pre>
              ) : null}
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
