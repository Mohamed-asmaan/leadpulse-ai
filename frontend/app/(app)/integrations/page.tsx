"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Webhook, Radio, Shield } from "lucide-react";

import { CopyField } from "@/components/integrations/CopyField";
import { apiFetch } from "@/lib/api";
import type { IntegrationStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { Badge } from "@/components/ui/Badge";
import { REST_LEADS_URL, TRACK_EVENT_URL, WEBHOOK_LEADS_URL } from "@/lib/integrationUrls";

export default function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await apiFetch<IntegrationStatus>("/api/v1/integrations/status");
        if (!cancelled) {
          setStatus(s);
          setStatusErr(null);
        }
      } catch (e) {
        if (!cancelled) setStatusErr(e instanceof Error ? e.message : "Could not load status");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const curlWebhook = `curl -X POST "${WEBHOOK_LEADS_URL}" -H "Content-Type: application/json" -d "{\\"name\\":\\"Partner Lead\\",\\"email\\":\\"lead@example.com\\",\\"company\\":\\"Acme\\",\\"source\\":\\"meta_ads_lead\\"}"`;

  const curlTrack = `curl -X POST "${TRACK_EVENT_URL}" -H "Content-Type: application/json" -H "X-Tracking-Secret: YOUR_SECRET" -d "{\\"lead_id\\":\\"<uuid>\\",\\"channel\\":\\"web\\",\\"event_type\\":\\"page_visit\\",\\"payload\\":{\\"path\\":\\"/pricing\\"}}"`;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-10">
      <PageHeader
        label="Integrations"
        title="External systems"
        description="Wire capture, tracking, and auth like a modular CRM backoffice — adapted to LeadPulse&apos;s real-time lead pipeline (not ERP/commerce)."
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
            Mirrors Open Mercato–style integration health: which vendors are actually configured on the API host
            (booleans only — no keys).
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
              <Flag ok={status.webhook_shared_secret_configured} label="Webhook token" warnUnlessTrue />
              <Flag ok={status.public_tracking_secret_configured} label="Tracking secret" warnUnlessTrue />
              <Flag ok={!status.synthetic_engagement_enabled} label="Live engagement (no sim)" warnUnlessTrue />
            </div>
          ) : !statusErr ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Webhook className="h-4 w-4 text-primary shrink-0" />
            <CardTitle>Inbound webhooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice variant="warning">
              Set <code className="text-amber-900">WEBHOOK_SHARED_SECRET</code> on the API host and send{" "}
              <code className="text-amber-900">X-Webhook-Token</code> on every request. Meta Lead Ads and Google
              lead-form JSON are auto-flattened server-side.
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

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Radio className="h-4 w-4 text-primary shrink-0" />
            <CardTitle>Behavioral tracking</CardTitle>
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
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Shield className="h-4 w-4 text-primary shrink-0" />
          <CardTitle>Authenticated REST</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Operator capture from the browser uses JWT. Server-to-server integrations can use the same endpoint with a
            service token.
          </p>
          <CopyField label="POST /api/v1/leads" value={REST_LEADS_URL} />
        </CardContent>
      </Card>
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
