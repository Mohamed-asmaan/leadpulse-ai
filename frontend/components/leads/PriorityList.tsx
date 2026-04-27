"use client";

import axios from "axios";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/config";
import { getToken } from "@/lib/auth";
import { API_V1 } from "@/lib/apiPaths";
import type { PriorityLead } from "@/lib/types";

function gradeBadgeClass(grade: PriorityLead["grade"]) {
  if (grade === "A") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (grade === "B") return "bg-blue-100 text-blue-800 border-blue-300";
  if (grade === "C") return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-red-100 text-red-800 border-red-300";
}

export function PriorityList() {
  const [rows, setRows] = useState<PriorityLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDead, setShowDead] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const token = getToken();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<PriorityLead[]>(
          `${API_BASE}${API_V1}/leads/priority-list`,
          {
            params: { include_dead: showDead },
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        );
        if (!cancelled) setRows(res.data);
      } catch {
        if (!cancelled) setError("Could not load priority list.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [showDead]);

  const ranked = useMemo(
    () => rows.map((lead, idx) => ({ rank: idx + 1, lead })),
    [rows],
  );

  if (loading) return <div className="text-sm text-muted-foreground">Loading ranked leads…</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Smart Priority List</h2>
        <label className="text-sm inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showDead}
            onChange={(e) => setShowDead(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show Dead Leads
        </label>
      </div>

      {ranked.length === 0 ? (
        <div className="text-sm text-muted-foreground">No leads found for this view.</div>
      ) : (
        <ul className="space-y-3">
          {ranked.map(({ rank, lead }) => {
            const isOpen = !!expanded[lead.lead_id];
            return (
              <li key={lead.lead_id} className="rounded-lg border p-3 bg-card">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [lead.lead_id]: !prev[lead.lead_id] }))
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-xl font-bold text-muted-foreground min-w-10">#{rank}</div>
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Last activity: {lead.last_activity ? new Date(lead.last_activity).toLocaleString() : "No activity yet"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded border ${gradeBadgeClass(lead.grade)}`}>
                        Grade {lead.grade}
                      </span>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 bg-slate-200 rounded">
                      <div
                        className="h-2 rounded bg-violet-500"
                        style={{ width: `${Math.max(0, Math.min(100, lead.score))}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Score: {lead.score}/100</div>
                  </div>
                </button>

                {isOpen ? (
                  <div className="mt-3 border-t pt-3">
                    <div className="text-sm font-medium mb-1">Why this rank</div>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                      {lead.score_reasons.length ? (
                        lead.score_reasons.map((reason, index) => <li key={`${lead.lead_id}-${index}`}>{reason}</li>)
                      ) : (
                        <li>No score reasons available yet.</li>
                      )}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
