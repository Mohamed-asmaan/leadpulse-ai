"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Globe,
  Megaphone,
  Radio,
  Shield,
  Webhook,
  Workflow,
} from "lucide-react";

import { CopyField } from "@/components/integrations/CopyField";
import { apiFetch } from "@/lib/api";
import type { AutomationWorkflow, IntegrationStatus } from "@/lib/types";
import {
  META_WEBHOOK_URL,
  REST_LEADS_URL,
  TRACK_EVENT_URL,
  WEBHOOK_LEADS_URL,
} from "@/lib/integrationUrls";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { Badge } from "@/components/ui/Badge";

export default function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<AutomationWorkflow[] | null>(null);
  const [wfErr, setWfErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, w] = await Promise.all([
          apiFetch<IntegrationStatus>("/api/v1/integrations/status"),
          apiFetch<AutomationWorkflow[]>("/api/v1/integrations/workflows"),
        ]);
        if (!cancelled) {
          setStatus(s);
          setWorkflows(w);
          setStatusErr(null);
          setWfErr(null);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Could not load integrations";
          setStatusErr(msg);
          setWfErr(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const curlWebhook = `curl -X POST "${WEBHOOK_LEADS_URL}" -H "Content-Type: application/json" -H "X-Webhook-Token: YOUR_SECRET" -d "{\\"name\\":\\"Google Lead\\",\\"email\\":\\"lead@example.com\\",\\"company\\":\\"Acme\\",\\"source\\":\\"google_ads_lead\\"}"`;

  const curlTrack = `curl -X POST "${TRACK_EVENT_URL}" -H "Content-Type: application/json" -H "X-Tracking-Secret: YOUR_SECRET" -d "{\\"lead_id\\":\\"<uuid>\\",\\"channel\\":\\"web\\",\\"event_type\\":\\"page_visit\\",\\"payload\\":{\\"path\\":\\"/pricing\\"}}"`;

  /** Absolute URLs for third-party sites; falls back to loopback when NEXT_PUBLIC_API_URL is unset. */
  const docApiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  const embedScriptAbs = `${docApiBase}/api/v1/public/embed/lead-form.js`;
  const websiteLeadAbs = `${docApiBase}/api/v1/public/website-lead`;

  const embedSnippet = `<form data-leadpulse-website-lead data-success-message="Thanks — we will reach out shortly.">
  <input name="name" required placeholder="Name" />
  <input name="email" type="email" required placeholder="Email" />
  <input name="phone" placeholder="Phone" />
  <input name="company" placeholder="Company" />
  <button type="submit">Request info</button>
</form>
<script src="${embedScriptAbs}" data-api="${docApiBase}" data-secret="YOUR_WEBSITE_FORM_SECRET" async><\/script>`;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-10">
      <PageHeader
        label="Integrations"
        title="Connect like a CRM"
        description="Wire Meta Lead Ads, Google-style payloads, your marketing site, and behavioral tracking into one pipeline: capture → enrich → score → automate outreach (Zoho-style ops, LeadPulse engine)."
        action={
          <Link
            href="/capture"
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm hover:bg-accent/40"
          >
            Console capture
          </Link>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Activity className="h-4 w-4 text-primary shrink-0" />
          <CardTitle>Live capability flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Booleans only — no API keys. Configure secrets in <code className="text-foreground/90">backend/.env</code>.
          </p>
          {statusErr ? <p className="text-xs text-destructive">{statusErr}</p> : null}
          {status ? (
            <div className="flex flex-wrap gap-2">
              <Flag ok={status.hunter_configured} label="Hunter.io" />
              <Flag ok={status.clearbit_configured} label="Clearbit" />
              <Flag ok={status.custom_enrichment_url_configured} label="Custom enrich URL" />
              <Flag ok={status.resend_configured} label="Resend email" />
              <Flag ok={status.twilio_configured} label="Twilio creds" />
              <Flag ok={status.hot_sms_enabled} label="HOT SMS enabled" warnUnlessTrue />
              <Flag ok={status.webhook_shared_secret_configured} label="Generic webhook token" warnUnlessTrue />
              <Flag ok={status.meta_webhook_verify_configured} label="Meta verify token" />
              <Flag ok={status.meta_app_secret_configured} label="Meta HMAC (signature)" warnUnlessTrue />
              <Flag ok={status.website_form_secret_configured} label="Website form secret" warnUnlessTrue />
              <Flag ok={status.public_tracking_secret_configured} label="Tracking secret" warnUnlessTrue />
              <Flag ok={!status.synthetic_engagement_enabled} label="Live engagement (no sim)" warnUnlessTrue />
            </div>
          ) : !statusErr ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Workflow className="h-4 w-4 text-primary shrink-0" />
          <CardTitle>Built-in automation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            End-to-end flows run in code today (no drag-and-drop builder yet). Each new lead triggers the pipeline below.
          </p>
          {wfErr ? <p className="text-xs text-destructive">{wfErr}</p> : null}
          {workflows?.map((w) => (
            <div key={w.id} className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <div className="text-sm font-semibold text-foreground">{w.name}</div>
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground/80">Trigger:</span> {w.trigger}
              </p>
              <ol className="list-decimal pl-4 text-[11px] text-muted-foreground space-y-1">
                {w.actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            </div>
          ))}
          {!workflows && !wfErr ? <p className="text-xs text-muted-foreground">Loading…</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary shrink-0" />
            <CardTitle>Meta (Facebook / Instagram) Lead Ads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-muted-foreground">
            <Notice variant="info">
              In Meta Developer Console, create an app with <strong>Webhooks</strong>, subscribe your Page to{" "}
              <code className="text-primary/90">leadgen</code>, set the callback URL to the value below, and use the
              same verify token as <code className="text-primary/90">META_WEBHOOK_VERIFY_TOKEN</code> in your API{" "}
              <code className="text-primary/90">.env</code>.
            </Notice>
            <ol className="list-decimal pl-4 space-y-2">
              <li>Add <code className="text-foreground/90">META_APP_SECRET</code> from the app — LeadPulse verifies every POST with <code className="text-foreground/90">X-Hub-Signature-256</code> when this is set.</li>
              <li>Meta sends <code className="text-foreground/90">field_data</code> JSON; the server flattens it into a lead (same pipeline as other channels).</li>
            </ol>
            <CopyField label="Callback URL (GET + POST)" value={META_WEBHOOK_URL} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <CardTitle>Google Ads lead forms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-muted-foreground">
            <Notice variant="info">
              Post the webhook payload that includes <code className="text-primary/90">user_column_data</code> (Google
              Lead Form Extension style) to the generic endpoint — the API unwraps columns into name / email / phone /
              company automatically.
            </Notice>
            <ol className="list-decimal pl-4 space-y-2">
              <li>Use Google’s webhook, Zapier, or Make to POST JSON to the URL below.</li>
              <li>Set <code className="text-foreground/90">WEBHOOK_SHARED_SECRET</code> and send header <code className="text-foreground/90">X-Webhook-Token</code> on every call.</li>
            </ol>
            <CopyField label="Inbound URL" value={WEBHOOK_LEADS_URL} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            <CardTitle>Website lead form (embed)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice variant="warning">
              Set <code className="text-amber-900">WEBSITE_FORM_SHARED_SECRET</code> on the API and pass the same value
              as <code className="text-amber-900">data-secret</code> on the script tag. The browser sends header{" "}
              <code className="text-amber-900">X-Website-Form-Secret</code> with each submission.
            </Notice>
            <CopyField label="POST JSON (absolute)" value={websiteLeadAbs} />
            <CopyField label="Embed script (absolute URL for external sites)" value={embedScriptAbs} />
            <Notice variant="info">
              Set <code className="text-primary/90">NEXT_PUBLIC_API_URL</code> in <code className="text-primary/90">frontend/.env.local</code> to your public API origin so the snippets below match production.
            </Notice>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
                HTML template
              </div>
              <pre className="text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                {embedSnippet}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Webhook className="h-4 w-4 text-primary shrink-0" />
            <CardTitle>Generic partner webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice variant="warning">
              For non-Meta sources, set <code className="text-amber-900">WEBHOOK_SHARED_SECRET</code> and send{" "}
              <code className="text-amber-900">X-Webhook-Token</code> on every request. Loose JSON and Meta/Google
              vendor shapes are normalized server-side.
            </Notice>
            <CopyField label="Endpoint" value={WEBHOOK_LEADS_URL} />
            <div>
              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
                Example
              </div>
              <pre className="text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                {curlWebhook}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Radio className="h-4 w-4 text-primary shrink-0" />
            <CardTitle>Behavioral tracking (site engagement)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice variant="info">
              Each event appends to the unified timeline and triggers a re-score. Use{" "}
              <code className="text-primary/90">PUBLIC_TRACKING_SECRET</code> + header{" "}
              <code className="text-primary/90">X-Tracking-Secret</code> in production.
            </Notice>
            <CopyField label="Endpoint" value={TRACK_EVENT_URL} />
            <div>
              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
                Example
              </div>
              <pre className="text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                {curlTrack}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0" />
            <CardTitle>Authenticated REST</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Operator capture from the dashboard uses JWT. Server-to-server integrations can POST here with a service
              token.
            </p>
            <CopyField label="POST /api/v1/leads" value={REST_LEADS_URL} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Flag({ ok, label, warnUnlessTrue }: { ok: boolean; label: string; warnUnlessTrue?: boolean }) {
  const warn = warnUnlessTrue ? !ok : false;
  const variant = ok ? "success" : warn ? "warning" : "outline";
  const text = ok ? "ON" : "OFF";
  return (
    <Badge variant={variant}>
      {label}: {text}
    </Badge>
  );
}
