"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";

import { API_BASE } from "@/lib/config";

type QRPayload = {
  valid: boolean;
  badge_type?: string | null;
  tier?: string | null;
  issued_at?: string | null;
  total_score?: number | null;
  industry?: string | null;
  contact_initial?: string | null;
  verification_message?: string | null;
};

export default function QrVerifyPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [data, setData] = useState<QRPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/v1/public/verify/qr/${encodeURIComponent(token)}`);
        const j = (await r.json()) as QRPayload;
        if (!cancelled) {
          setData(j);
          setErr(null);
        }
      } catch {
        if (!cancelled) setErr("Could not reach verification service.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          {data?.valid ? (
            <ShieldCheck className="h-10 w-10 text-emerald-400 shrink-0" />
          ) : data ? (
            <ShieldAlert className="h-10 w-10 text-amber-400 shrink-0" />
          ) : (
            <ShieldCheck className="h-10 w-10 text-slate-600 shrink-0 animate-pulse" />
          )}
          <div>
            <h1 className="text-lg font-semibold tracking-tight">LeadPulse verification</h1>
            <p className="text-xs text-slate-500 mt-0.5">Public credential check (read-only)</p>
          </div>
        </div>

        {err ? <p className="text-sm text-rose-400">{err}</p> : null}

        {!data && !err ? <p className="text-sm text-slate-400">Checking token…</p> : null}

        {data ? (
          <div className="space-y-4 text-sm">
            <div
              className={`rounded-lg border px-4 py-3 flex gap-2 ${
                data.valid ? "border-emerald-800/60 bg-emerald-950/20" : "border-amber-900/50 bg-amber-950/15"
              }`}
            >
              {data.valid ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
              )}
              <p className="text-slate-200 leading-relaxed">{data.verification_message}</p>
            </div>

            {data.valid ? (
              <dl className="grid grid-cols-1 gap-3 text-xs">
                <Row label="Tier" value={(data.tier || "—").toUpperCase()} />
                <Row label="Model score" value={data.total_score != null ? `${data.total_score}/100` : "—"} />
                <Row label="Industry signal" value={data.industry || "—"} />
                <Row label="Contact (redacted)" value={data.contact_initial || "—"} />
                <Row label="Badge type" value={data.badge_type || "—"} />
                <Row label="Issued" value={data.issued_at ? new Date(data.issued_at).toLocaleString() : "—"} />
              </dl>
            ) : null}
          </div>
        ) : null}

        <p className="mt-8 text-[11px] text-slate-600 leading-relaxed">
          This page confirms that LeadPulse issued a HOT-tier verification badge for a captured lead. It does not
          expose full PII. For disputes, contact your workspace administrator.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-800/80 pb-2">
      <dt className="text-slate-500 shrink-0">{label}</dt>
      <dd className="text-slate-200 text-right break-words">{value}</dd>
    </div>
  );
}
