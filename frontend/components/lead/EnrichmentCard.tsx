"use client";

import type { Lead } from "@/lib/types";

export function EnrichmentCard({ lead }: { lead: Lead }) {
  return (
    <section className="rounded-xl border border-border bg-muted/60 p-5">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">Validated enrichment</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">Firmographics and intent-ready firm signals after API or mock enrichment.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Item k="Job title" v={lead.job_title} />
        <Item k="Industry" v={lead.industry} />
        <Item
          k="Company size"
          v={lead.company_size_band}
          hint={lead.company_size_estimate ? `${lead.company_size_estimate} est.` : undefined}
        />
        <Item k="Country" v={lead.location_country} />
        <Item k="Provider" v={lead.enrichment_provider} />
        <Item k="Trust" v={lead.authenticity_trust} />
        <Item k="Bot risk" v={lead.bot_risk_score != null ? String(lead.bot_risk_score) : null} />
        <Item k="Enriched at" v={lead.enriched_at ? new Date(lead.enriched_at).toLocaleString() : null} />
      </div>
    </section>
  );
}

function Item({ k, v, hint }: { k: string; v: string | null | undefined; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className="text-sm text-foreground mt-0.5">
        {v || "N/A"}
        {hint ? <span className="text-muted-foreground text-xs ml-2">({hint})</span> : null}
      </div>
    </div>
  );
}
