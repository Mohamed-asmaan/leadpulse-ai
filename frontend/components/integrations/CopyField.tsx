"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/70 p-3">
        <code className="min-w-0 flex-1 break-all text-xs text-foreground">{value}</code>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => void onCopy()} aria-label="Copy">
          {copied ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
