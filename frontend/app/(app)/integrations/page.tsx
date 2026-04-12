"use client";

import Link from "next/link";
import { Webhook, Radio, Shield } from "lucide-react";

import { CopyField } from "@/components/integrations/CopyField";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { REST_LEADS_URL, TRACK_EVENT_URL, WEBHOOK_LEADS_URL } from "@/lib/integrationUrls";

export default function IntegrationsPage() {
  const curlWebhook = `curl -X POST "${WEBHOOK_LEADS_URL}" -H "Content-Type: application/json" -d "{\\"name\\":\\"Partner Lead\\",\\"email\\":\\"lead@example.com\\",\\"company\\":\\"Acme\\",\\"source\\":\\"meta_ads_lead\\"}"`;

  const curlTrack = `curl -X POST "${TRACK_EVENT_URL}" -H "Content-Type: application/json" -H "X-Tracking-Secret: YOUR_SECRET" -d "{\\"lead_id\\":\\"<uuid>\\",\\"channel\\":\\"web\\",\\"event_type\\":\\"page_visit\\",\\"payload\\":{\\"path\\":\\"/pricing\\"}}"`;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-10">
      <PageHeader
        label="Integrations"
        title="External systems"
        description="Wire capture, tracking, and auth the same way a modular CRM backoffice would — scoped to LeadPulse’s real-time lead pipeline (not full ERP/commerce)."
        action={
          <Link
            href="/capture"
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm hover:bg-accent/40"
          >
            Console capture
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Webhook className="h-4 w-4 text-primary shrink-0" />
            <CardTitle>Inbound webhooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice variant="warning">
              Set <code className="text-amber-200/90">WEBHOOK_SHARED_SECRET</code> on the API host and send{" "}
              <code className="text-amber-200/90">X-Webhook-Token</code> on every request. Meta Lead Ads and Google
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
              <code className="text-sky-200/90">PUBLIC_TRACKING_SECRET</code> + header{" "}
              <code className="text-sky-200/90">X-Tracking-Secret</code> in production.
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
