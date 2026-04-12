import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { FunnelStageCounts, SourceHotStat } from "./leadMetrics";
import type { Lead } from "./types";

function lastTableY(doc: jsPDF): number {
  const d = doc as unknown as { lastAutoTable?: { finalY: number } };
  return d.lastAutoTable?.finalY ?? 120;
}

export function exportLeadsCsv(leads: Lead[], filename = "leadpulse-leads.csv") {
  const headers = [
    "id",
    "name",
    "email",
    "source",
    "total_score",
    "tier",
    "created_at",
    "first_outreach_at",
    "response_sec",
  ];
  const rows = leads.map((l) => {
    const resp =
      l.first_outreach_at != null
        ? String(
            Math.max(
              0,
              (new Date(l.first_outreach_at).getTime() - new Date(l.created_at).getTime()) / 1000,
            ),
          )
        : "";
    return [
      l.id,
      l.name,
      l.email,
      l.source,
      l.total_score ?? "",
      l.tier ?? "",
      l.created_at,
      l.first_outreach_at ?? "",
      resp,
    ];
  });
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAnalyticsPdf(opts: {
  funnel: FunnelStageCounts;
  sources: SourceHotStat[];
  avgResponseSec: number | null;
  accuracyProxy: number;
  accuracyNote: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text("LeadPulse AI — Analytics Report", 40, 48);
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toISOString()}`, 40, 66);

  doc.setFontSize(12);
  doc.text("Lifecycle funnel (dataset snapshot)", 40, 92);
  autoTable(doc, {
    startY: 100,
    head: [["Stage", "Count"]],
    body: [
      ["Captured", String(opts.funnel.captured)],
      ["Enriched", String(opts.funnel.enriched)],
      ["Scored", String(opts.funnel.scored)],
      ["Contacted", String(opts.funnel.contacted)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  const yAfter = lastTableY(doc) + 24;
  doc.setFontSize(12);
  doc.text("Performance", 40, yAfter);
  autoTable(doc, {
    startY: yAfter + 8,
    head: [["Metric", "Value"]],
    body: [
      [
        "Avg response time",
        opts.avgResponseSec == null ? "—" : `${(opts.avgResponseSec / 60).toFixed(2)} min`,
      ],
      ["Scoring accuracy (proxy)", `${opts.accuracyProxy}%`],
      ["Accuracy note", opts.accuracyNote],
    ],
    styles: { fontSize: 9, cellWidth: "wrap" },
    columnStyles: { 1: { cellWidth: 320 } },
    headStyles: { fillColor: [15, 23, 42] },
  });

  const y2 = lastTableY(doc) + 24;
  doc.setFontSize(12);
  doc.text("Hot lead rate by source", 40, y2);
  autoTable(doc, {
    startY: y2 + 8,
    head: [["Source", "Total", "Hot", "Hot rate"]],
    body: opts.sources.map((s) => [
      s.source,
      String(s.total),
      String(s.hot),
      `${(s.hotRate * 100).toFixed(1)}%`,
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  doc.save("leadpulse-analytics.pdf");
}
