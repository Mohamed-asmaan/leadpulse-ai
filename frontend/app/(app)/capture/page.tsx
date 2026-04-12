"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Radio } from "lucide-react";

import { REST_LEADS_URL, TRACK_EVENT_URL, WEBHOOK_LEADS_URL } from "@/lib/integrationUrls";
import { apiFetch } from "@/lib/api";
import { getRole } from "@/lib/auth";
import type { Lead } from "@/lib/types";

const SOURCE_PRESETS = [
  { value: "website_contact_form", label: "Website contact form" },
  { value: "meta_ads_lead", label: "Meta (Facebook / Instagram) ads" },
  { value: "linkedin_campaign", label: "LinkedIn campaign" },
  { value: "google_ads_lsa", label: "Google Ads / LSA" },
  { value: "partner_referral", label: "Partner referral" },
  { value: "event_trade_show", label: "Event / trade show" },
  { value: "inbound_call", label: "Inbound call / chat" },
  { value: "manual_entry", label: "Manual / ops entry" },
] as const;

export default function CapturePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("manual_entry");
  const [customSource, setCustomSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const effectiveSource = source === "custom" ? customSource.trim() : source;
  const webhookUrl = useMemo(() => WEBHOOK_LEADS_URL, []);
  const trackUrl = useMemo(() => TRACK_EVENT_URL, []);
  const restUrl = useMemo(() => REST_LEADS_URL, []);

  const curlWebhook = useMemo(
    () =>
      `curl -X POST "${webhookUrl}" -H "Content-Type: application/json" -d "{\\"name\\":\\"Webhook Lead\\",\\"email\\":\\"webhook-demo@example.com\\",\\"company\\":\\"Partner Co\\",\\"source\\":\\"partner_crm\\"}"`,
    [webhookUrl],
  );

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setMsg("Could not copy — select the text manually.");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!effectiveSource) {
      setMsg("Choose a source or enter a custom source.");
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        source: effectiveSource,
      };
      if (phone.trim()) payload.phone = phone.trim();
      if (company.trim()) payload.company = company.trim();

      const lead = await apiFetch<Lead>("/api/v1/leads", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/leads/${lead.id}`);
    } catch (err) {
      if (err instanceof Error) setMsg(err.message);
      else setMsg("Capture failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Capture & integrations</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
          Add leads from the operations console (runs the real pipeline: dedupe → enrichment (Hunter/Clearbit when
          configured) →{" "}
          <span className="text-slate-300">scoring (ICP + intent + engagement + ML blend)</span> → Resend/Twilio
          outreach when configured). External systems POST JSON to the webhook URL — no browser session required.
          Meta Lead Ads and Google lead-form payloads are auto-flattened.
        </p>
        {getRole() === "sales" ? (
          <p className="text-xs text-amber-200/90 border border-amber-900/40 rounded-lg px-3 py-2 bg-amber-950/25 max-w-2xl">
            As <strong>sales</strong>, new leads stay invisible in your list until an <strong>admin</strong> assigns
            them to you.
          </p>
        ) : null}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Radio className="h-4 w-4 text-sky-400" />
          New lead (authenticated)
        </div>
        <p className="text-xs text-slate-500">
          Creates a row in Postgres and immediately runs the same backend pipeline used for API/webhook capture.
        </p>
        {msg ? <div className="text-sm text-rose-300 border border-rose-900/40 rounded-lg px-3 py-2">{msg}</div> : null}
        <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
          <Field label="Full name" required>
            <input
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Phone (optional)">
            <input
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 0100"
            />
          </Field>
          <Field label="Company (optional)">
            <input
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </Field>
          <Field label="Source channel" required>
            <select
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {SOURCE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </Field>
          {source === "custom" ? (
            <Field label="Custom source id" required>
              <input
                className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                placeholder="e.g. hubspot_form_42"
                required
              />
            </Field>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full sm:w-auto rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white"
          >
            {busy ? "Running pipeline…" : "Capture lead"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">External capture (webhook)</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Point Meta Lead Ads, Google Ads lead forms, Typeform, or any HTTP client at this URL. JSON is normalized to
          name / email / phone / company / source (nested vendor payloads are unwrapped). If you set{" "}
          <code className="text-slate-400">WEBHOOK_SHARED_SECRET</code> on the API host, send header{" "}
          <code className="text-slate-400">X-Webhook-Token</code> with the same value.
        </p>
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Webhook URL</div>
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-xs text-sky-200 break-all bg-slate-950 border border-slate-800 rounded px-2 py-1.5 flex-1 min-w-0">
              {webhookUrl}
            </code>
            <button
              type="button"
              onClick={() => copyText("wh", webhookUrl)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
            >
              {copied === "wh" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copy
            </button>
            <a
              href={webhookUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open (GET may 405 — POST only)
            </a>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Example curl</div>
          <pre className="text-[11px] text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {curlWebhook}
          </pre>
          <button
            type="button"
            onClick={() => copyText("curl", curlWebhook)}
            className="text-xs text-sky-400 hover:underline"
          >
            Copy curl
          </button>
        </div>
        <div className="text-xs text-slate-600">
          REST capture (same payload as this form): <code className="text-slate-500 break-all">{restUrl}</code> — requires{" "}
          <code className="text-slate-500">Authorization: Bearer …</code> (use the dashboard form or Swagger with
          Authorize).
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Behavioral tracking (website / product)</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          After you know a lead&apos;s UUID (from capture response or CRM), append timeline events from your site or
          app. Each event <strong>re-scores</strong> the lead. Set{" "}
          <code className="text-slate-400">PUBLIC_TRACKING_SECRET</code> on the API and send matching header{" "}
          <code className="text-slate-400">X-Tracking-Secret</code> (recommended in production).
        </p>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">Tracking URL</div>
        <code className="text-xs text-sky-200 break-all bg-slate-950 border border-slate-800 rounded px-2 py-1.5 block">
          {trackUrl}
        </code>
        <pre className="text-[11px] text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {`curl -X POST "${trackUrl}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Tracking-Secret: YOUR_SECRET" \\\n  -d "{\\"lead_id\\":\\"<uuid>\\",\\"channel\\":\\"web\\",\\"event_type\\":\\"page_visit\\",\\"payload\\":{\\"path\\":\\"/pricing\\"},\\"summary\\":\\"Visited pricing\\"}"`}
        </pre>
      </section>

      <p className="text-xs text-slate-600">
        After capture, open{" "}
        <Link href="/leads" className="text-sky-400 hover:underline">
          Lead Management
        </Link>{" "}
        or the lead detail page to see enrichment, scores, timeline, and outreach logs.
      </p>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-slate-400">
        {label}
        {required ? <span className="text-rose-400/80"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
