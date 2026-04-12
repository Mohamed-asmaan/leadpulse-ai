"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield, SlidersHorizontal, Sparkles } from "lucide-react";

import { getUseMockLeads, setUseMockLeads } from "@/lib/preferences";
import { getRole } from "@/lib/auth";

export default function SettingsPage() {
  const [mock, setMock] = useState(false);

  useEffect(() => {
    setMock(getUseMockLeads());
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Workspace preferences. Shell components and navigation patterns borrow from Open Mercato&apos;s backoffice UX
          (MIT), reinterpreted for LeadPulse lead velocity.
        </p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Shield className="h-4 w-4 text-sky-400" />
          Role-based access (RBAC)
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          You are signed in as <span className="text-slate-200 capitalize">{getRole()}</span>. Admins can view all
          leads, analytics, user directory, and document verification APIs. Sales representatives only see leads
          explicitly assigned to them by an administrator.
        </p>
        <table className="w-full text-xs border border-slate-800 rounded-lg overflow-hidden">
          <thead className="bg-slate-950 text-slate-500 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Capability</th>
              <th className="px-3 py-2 font-medium">Admin</th>
              <th className="px-3 py-2 font-medium">Sales</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            <Row cap="Lead Management (assigned)" admin="All leads" sales="Assigned only" />
            <Row cap="Analytics & exports" admin="Full" sales="No access" />
            <Row cap="User directory" admin="Yes" sales="No" />
            <Row cap="Webhook ingestion" admin="Server" sales="Server" />
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Sparkles className="h-4 w-4 text-violet-400" />
          Data pipeline and AI scoring
        </div>
        <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
          <li>
            <span className="text-slate-300">Capture</span> — operators use{" "}
            <Link href="/capture" className="text-sky-400 hover:underline">
              Capture
            </Link>{" "}
            (REST + JWT). Ads/forms use the public webhook URL shown there (optional{" "}
            <code className="text-slate-500">X-Webhook-Token</code>).
          </li>
          <li>
            <span className="text-slate-300">Enrichment</span> — Hunter.io + optional Clearbit + custom HTTP, then
            heuristic fallback so capture never blocks.
          </li>
          <li>
            <span className="text-slate-300">Scoring</span> — 40% ICP fit, 30% intent (keywords / metadata), 30%
            engagement from the unified timeline, blended with an on-device GradientBoosting head for non-linear
            ranking. Reasons + model rationale are stored on the lead row.
          </li>
          <li>
            <span className="text-slate-300">Outreach</span> — HOT email via Resend when keys are set; optional HOT SMS
            via Twilio. Without keys, messages are stored as simulated for audit.
          </li>
          <li>
            <span className="text-slate-300">Tracking</span> — POST behavioral events to the public tracking endpoint
            (see Capture page); optional <code className="text-slate-500">X-Tracking-Secret</code>.
          </li>
        </ul>
        <p className="text-xs text-amber-200/80 border border-amber-900/40 rounded-lg px-3 py-2 bg-amber-950/20">
          Sales reps only see leads <strong>assigned</strong> to them. After capture, an <strong>admin</strong> should
          assign new rows in Lead detail so sales can work them.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <SlidersHorizontal className="h-4 w-4 text-amber-300" />
          Performance lab (mock dataset)
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-300">Off (default):</strong> Lead Management, Pipeline, and Analytics use your
          real API — names and emails are whatever you captured (webhook, form, console).{" "}
          <strong className="text-slate-300">On:</strong> the browser loads ~1,200 <em>synthetic</em> leads only to
          stress-test tables and filters; they are not written to your database.
        </p>
        <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3">
          <span className="text-sm text-slate-200">Use mock lead universe (1,200 rows)</span>
          <input
            type="checkbox"
            checked={mock}
            onChange={(e) => {
              setUseMockLeads(e.target.checked);
              setMock(e.target.checked);
            }}
            className="h-4 w-4 accent-sky-500"
          />
        </label>
      </section>
    </div>
  );
}

function Row({ cap, admin, sales }: { cap: string; admin: string; sales: string }) {
  return (
    <tr>
      <td className="px-3 py-2 text-slate-400">{cap}</td>
      <td className="px-3 py-2">{admin}</td>
      <td className="px-3 py-2">{sales}</td>
    </tr>
  );
}
