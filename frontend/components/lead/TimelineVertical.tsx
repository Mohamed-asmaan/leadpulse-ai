"use client";

import type { LeadEvent } from "@/lib/types";

const label: Record<string, string> = {
  lead_created: "Lead captured",
  form_submit: "Form submitted",
  rest_capture: "REST capture",
  webhook_received: "Webhook received",
  outreach_sent: "Automated outreach sent",
  email_open: "Email opened",
  email_click: "Email link clicked",
  page_visit: "Website visited",
  meeting_booked: "Meeting booked",
};

export function TimelineVertical({ events }: { events: LeadEvent[] }) {
  const sorted = [...events].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
      <h2 className="text-sm font-semibold tracking-tight text-slate-100">Unified behavioral profile</h2>
      <p className="text-xs text-slate-500 mt-1 mb-4">Chronological timeline across channels — single source of truth.</p>
      <div className="relative pl-6">
        <div className="absolute left-2 top-1 bottom-1 w-px bg-gradient-to-b from-sky-600/60 via-slate-700 to-slate-800" />
        <ul className="space-y-5">
          {sorted.map((ev) => (
            <li key={ev.id} className="relative">
              <span className="absolute -left-[17px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-sky-500 shadow-[0_0_12px_rgba(56,189,248,0.35)]" />
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                {new Date(ev.occurred_at).toLocaleString()}
              </div>
              <div className="text-sm font-medium text-slate-100 mt-0.5">
                {label[ev.event_type] || ev.event_type.replace(/_/g, " ")}
                <span className="text-slate-500 font-normal"> · {ev.channel}</span>
              </div>
              {ev.summary ? <p className="text-xs text-slate-400 mt-1">{ev.summary}</p> : null}
            </li>
          ))}
        </ul>
        {sorted.length === 0 ? <p className="text-sm text-slate-500">No interactions recorded yet.</p> : null}
      </div>
    </section>
  );
}
