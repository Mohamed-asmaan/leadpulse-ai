"use client";

import type { LeadEvent } from "@/lib/types";

const label: Record<string, string> = {
  lead_created: "Lead captured",
  enriched: "Profile enriched",
  scored: "AI score computed",
  form_submit: "Form submitted",
  rest_capture: "REST capture",
  webhook_received: "Webhook received",
  outreach_sent: "Automated outreach sent",
  email_sent: "Automated email dispatched",
  nurture_marked: "Nurture track scheduled",
  low_priority_bucket: "Cold / low-priority bucket",
  email_open: "Email opened",
  email_click: "Email link clicked",
  page_visit: "Website visited",
  meeting_booked: "Meeting booked",
};

export function TimelineVertical({ events }: { events: LeadEvent[] }) {
  const sorted = [...events].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  return (
    <section className="rounded-xl border border-border bg-muted/40 p-5">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">Unified behavioral profile</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">Chronological timeline across channels — single source of truth.</p>
      <div className="relative pl-6">
        <div className="absolute left-2 top-1 bottom-1 w-px bg-gradient-to-b from-primary/50 via-border to-border" />
        <ul className="space-y-5">
          {sorted.map((ev) => (
            <li key={ev.id} className="relative">
              <span className="absolute -left-[17px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary shadow-sm ring-2 ring-primary/20" />
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {new Date(ev.occurred_at).toLocaleString()}
              </div>
              <div className="text-sm font-medium text-foreground mt-0.5">
                {label[ev.event_type] || ev.event_type.replace(/_/g, " ")}
                <span className="text-muted-foreground font-normal"> · {ev.channel}</span>
              </div>
              {ev.summary ? <p className="text-xs text-muted-foreground mt-1">{ev.summary}</p> : null}
            </li>
          ))}
        </ul>
        {sorted.length === 0 ? <p className="text-sm text-muted-foreground">No interactions recorded yet.</p> : null}
      </div>
    </section>
  );
}
