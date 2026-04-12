"use client";

import { useEffect, useState } from "react";
import { QrCode, ShieldCheck } from "lucide-react";

import { API_BASE } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import type { LeadVerification } from "@/lib/types";

export function VerificationPanel({ leadId }: { leadId: string }) {
  const [data, setData] = useState<LeadVerification | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await apiFetch<LeadVerification>(`/api/v1/leads/${leadId}/verification`);
        if (!cancelled) {
          setData(v);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load verification");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">Verification & integrity</h2>
          <p className="text-xs text-slate-500 mt-1">
            Cryptographic profile fingerprint and QR-backed status checks for high-integrity workflows.
          </p>
        </div>
      </div>
      {err ? <p className="text-xs text-rose-400">{err}</p> : null}
      {data ? (
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Profile integrity (SHA-256 prefix)</div>
            <code className="mt-1 block break-all rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-300">
              {data.profile_integrity_hash}
            </code>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-2">
              <QrCode className="h-3.5 w-3.5" />
              QR validation endpoints
            </div>
            {data.qr_verify_paths.length === 0 ? (
              <p className="text-xs text-slate-500">No QR badge issued yet (typically created for HOT leads).</p>
            ) : (
              <ul className="space-y-3">
                {data.qr_verify_paths.map((p) => {
                  const url = `${API_BASE}${p}`;
                  const m = p.match(/\/verify\/qr\/([^/?]+)/);
                  const token = m?.[1];
                  const human = token ? `/verify/qr/${token}` : null;
                  return (
                    <li key={p} className="space-y-1">
                      {human ? (
                        <a href={human} className="text-xs text-emerald-300 hover:underline font-medium">
                          Open public verification page
                        </a>
                      ) : null}
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-xs text-sky-300/90 hover:underline break-all"
                      >
                        API (JSON): {url}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : !err ? (
        <p className="text-xs text-slate-500">Loading verification artifacts…</p>
      ) : null}
    </section>
  );
}
