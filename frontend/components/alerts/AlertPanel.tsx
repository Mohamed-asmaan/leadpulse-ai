"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";

import { getToken } from "@/lib/auth";
import { API_BASE } from "@/lib/config";
import { API_V1 } from "@/lib/apiPaths";
import type { LeadAlert } from "@/lib/types";

const ALERT_SECONDS = 5 * 60;

function mmss(total: number): string {
  const clamped = Math.max(0, total);
  const mm = String(Math.floor(clamped / 60)).padStart(2, "0");
  const ss = String(clamped % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function playBeep() {
  if (typeof window === "undefined") return;
  const ctx = new window.AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

export function AlertPanel() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<LeadAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const prevIds = useRef<Set<string>>(new Set());

  const authHeaders = useMemo(() => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await axios.get<LeadAlert[]>(`${API_BASE}${API_V1}/alerts/active`, {
          headers: authHeaders,
        });
        if (cancelled) return;
        const next = res.data;
        const nextIds = new Set(next.map((x) => x.id));
        const hasNew = next.some((x) => !prevIds.current.has(x.id));
        setAlerts(next);
        prevIds.current = nextIds;
        if (hasNew) {
          if ("Notification" in window && Notification.permission === "default") {
            void Notification.requestPermission();
          }
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("New lead alert", { body: "High-priority lead needs a fast response." });
          }
          playBeep();
        }
      } catch {
        if (!cancelled) setError("Could not load active alerts.");
      }
    }
    void load();
    const poll = window.setInterval(() => {
      void load();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [authHeaders]);

  async function respond(alertId: string, leadId: string) {
    await axios.post(`${API_BASE}${API_V1}/alerts/${alertId}/respond`, undefined, {
      headers: authHeaders,
    });
    setAlerts((prev) => prev.filter((x) => x.id !== alertId));
    router.push(`/leads/${leadId}`);
  }

  const nowMs = Date.now() + tick * 0;
  const visibleAlerts = alerts.slice(0, 6);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {alerts.length > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] leading-4 text-center font-semibold">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[85vw] rounded-lg border border-border bg-card shadow-lg z-50">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">Notifications</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>

          {error ? (
            <div className="px-3 py-2 text-xs text-rose-800 bg-rose-50 border-b border-rose-200">{error}</div>
          ) : null}

          <div className="max-h-96 overflow-y-auto">
            {visibleAlerts.length === 0 ? (
              <div className="px-3 py-6 text-xs text-muted-foreground">No active alerts.</div>
            ) : (
              visibleAlerts.map((alert) => {
                const liveElapsed = Math.max(0, Math.floor((nowMs - new Date(alert.triggered_at).getTime()) / 1000));
                const remaining = ALERT_SECONDS - liveElapsed;
                const escalated = alert.escalated || remaining <= 0;
                return (
                  <div key={alert.id} className="px-3 py-3 border-b border-border last:border-b-0 space-y-2">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {alert.lead_name} - {alert.trigger_reason}
                    </div>
                    <div className={["text-[11px]", escalated ? "text-rose-700" : "text-amber-700"].join(" ")}>
                      {escalated ? "Escalated. Manager notified." : `Respond in ${mmss(remaining)}`}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void respond(alert.id, alert.lead_id)}
                        className="rounded border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
                      >
                        Contact now
                      </button>
                      <Link
                        href={`/leads/${alert.lead_id}`}
                        onClick={() => setOpen(false)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Open lead
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {alerts.length > visibleAlerts.length ? (
            <div className="px-3 py-2 border-t border-border text-[11px] text-muted-foreground">
              Showing latest {visibleAlerts.length} of {alerts.length} alerts.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
