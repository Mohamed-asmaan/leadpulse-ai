"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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

  if (error) {
    return <div className="mx-4 md:mx-6 mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>;
  }

  if (alerts.length === 0) return null;

  const nowMs = Date.now() + tick * 0;

  return (
    <div className="mx-4 md:mx-6 mt-3 space-y-2">
      {alerts.map((alert) => {
        const liveElapsed = Math.max(
          0,
          Math.floor((nowMs - new Date(alert.triggered_at).getTime()) / 1000),
        );
        const remaining = ALERT_SECONDS - liveElapsed;
        const escalated = alert.escalated || remaining <= 0;
        return (
          <div
            key={alert.id}
            className={[
              "rounded-md border px-3 py-2 text-sm flex flex-wrap items-center justify-between gap-3",
              escalated
                ? "border-red-900 bg-red-950/80 text-red-100"
                : "border-red-500/45 bg-red-500/10 text-red-900 dark:text-red-100",
            ].join(" ")}
          >
            <div className="min-w-0">
              <div className="font-semibold">
                {alert.lead_name} — {alert.trigger_reason}
              </div>
              <div className="text-xs opacity-90">
                {escalated ? "ESCALATED - Manager Notified" : `Respond in ${mmss(remaining)}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void respond(alert.id, alert.lead_id)}
                className="rounded bg-white/90 text-red-900 hover:bg-white px-3 py-1.5 text-xs font-semibold"
              >
                Contact Now
              </button>
              <Link href={`/leads/${alert.lead_id}`} className="text-xs underline underline-offset-2">
                Open lead
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
