"use client";

import Link from "next/link";
import { Brain, Cable, Sparkles } from "lucide-react";

import { AiAutomationAssistant } from "@/components/ai/AiAutomationAssistant";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { LEADS_DASHBOARD_QUERY } from "@/lib/constants/dataFetch";
import { useLeadsList } from "@/lib/hooks/useLeadsList";
import { getRole } from "@/lib/auth";

export default function IntelligencePage() {
  const isAdmin = getRole() === "admin";
  const { data: leads = [], error, isPending } = useLeadsList(LEADS_DASHBOARD_QUERY, { refetchInterval: 5000 });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <PageHeader
        label="AI Studio"
        title="Intelligence & automation"
        description="Every lead is scored by the LeadPulse AI engine (ICP fit + intent + engagement, blended with an on-device gradient-boosting head). Use this hub for prioritized actions — then open any lead’s AI & scores tab for full explainability."
        action={
          <Link
            href="/integrations"
            className="inline-flex h-9 items-center rounded-md border border-violet-500/40 bg-violet-500/10 px-4 text-sm font-medium text-violet-900 dark:text-violet-100 hover:bg-violet-500/20"
          >
            <Cable className="h-4 w-4 mr-2" />
            Connect ads & site
          </Link>
        }
      />

      {error ? <div className="text-sm text-destructive border border-border rounded-lg p-3">{error.message}</div> : null}
      {isPending && leads.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-border rounded-lg p-4">Loading leads…</div>
      ) : null}

      <Notice variant="info">
        <span className="font-medium text-foreground">Where the AI lives in the product:</span> each lead’s{" "}
        <strong>AI & scores</strong> tab shows the composite model, per-dimension reasons, and ML summary text returned
        by the API. This page surfaces <strong>what to do next</strong> across your pipeline.
      </Notice>

      <AiAutomationAssistant leads={leads} isAdmin={isAdmin} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Brain className="h-4 w-4 text-primary shrink-0" />
            <CardTitle>How scoring works</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">40%</strong> ideal-customer profile (industry + company size),{" "}
              <strong className="text-foreground">30%</strong> intent keywords from capture text,{" "}
              <strong className="text-foreground">30%</strong> behavioral timeline (opens, clicks, meetings).
            </p>
            <p>
              The backend can <strong className="text-foreground">blend in a GradientBoosting</strong> probability (
              <code className="text-foreground/90">ML_BLEND_WEIGHT</code> in server config) so totals are not purely
              linear — you still see human-readable reasons on the lead screen.
            </p>
            <p>
              <strong className="text-foreground">Automation:</strong> HOT triggers immediate email (and optional SMS),
              WARM schedules nurture, COLD is bucketed — same rules for Meta, Google, website, or console capture.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
            <CardTitle>Get more from AI</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Log <strong className="text-foreground">email_open</strong> /{" "}
                <strong className="text-foreground">page_visit</strong> events so engagement scores move.
              </li>
              <li>
                Wire{" "}
                <Link href="/integrations" className="text-primary font-medium hover:underline">
                  Meta & Google webhooks
                </Link>{" "}
                so AI sees real ad leads.
              </li>
              <li>
                Open a HOT lead and use <strong className="text-foreground">Instant outreach</strong> from the workspace
                header.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
