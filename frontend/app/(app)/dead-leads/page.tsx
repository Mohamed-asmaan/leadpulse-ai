"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/ui/PageHeader";
import { getRole, getToken } from "@/lib/auth";
import { API_BASE } from "@/lib/config";
import { API_V1 } from "@/lib/apiPaths";
import type { DeadLeadItem, DeadLeadSummary } from "@/lib/types";

export default function DeadLeadDetectorPage() {
  const [rows, setRows] = useState<DeadLeadItem[]>([]);
  const [summary, setSummary] = useState<DeadLeadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = getRole() === "admin";
  const token = getToken();
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [deadRes, summaryRes] = await Promise.all([
        axios.get<DeadLeadItem[]>(`${API_BASE}${API_V1}/leads/dead`, { headers }),
        axios.get<DeadLeadSummary>(`${API_BASE}${API_V1}/leads/dead/summary`, { headers }),
      ]);
      setRows(deadRes.data);
      setSummary(summaryRes.data);
    } catch {
      setError("Could not load dead lead detector.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function revive(leadId: string) {
    await axios.post(`${API_BASE}${API_V1}/leads/${leadId}/revive`, undefined, { headers });
    await load();
  }

  async function archiveAll() {
    await axios.post(`${API_BASE}${API_V1}/leads/dead/archive-all`, undefined, { headers });
    await load();
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        label="Retention control"
        title="Dead Lead Detector"
        description="Archive non-converting leads to stop wasted outreach and keep focus on real opportunities."
      />

      {summary ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <span className="font-semibold">{summary.archived_this_month}</span> leads archived this month, saving your
          team approximately <span className="font-semibold">{summary.estimated_hours_saved}</span> hours of wasted
          outreach.
        </div>
      ) : null}

      {isAdmin ? (
        <div>
          <button
            type="button"
            onClick={() => void archiveAll()}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Archive All Dead Leads
          </button>
        </div>
      ) : null}

      {loading ? <div className="text-sm text-muted-foreground">Loading dead leads…</div> : null}
      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {!loading ? (
        <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/80 text-left">
              <tr>
                <th className="px-3 py-2">Lead</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Marked dead</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.lead_id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-3 py-2">{row.lead_name}</td>
                  <td className="px-3 py-2">{row.reason}</td>
                  <td className="px-3 py-2">{new Date(row.marked_dead_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {row.score} ({row.grade})
                  </td>
                  <td className="px-3 py-2">
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => void revive(row.lead_id)}
                        className="rounded border border-border bg-card px-2 py-1 text-xs hover:bg-muted"
                      >
                        Revive
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Admin only</span>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={5}>
                    No dead leads found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
