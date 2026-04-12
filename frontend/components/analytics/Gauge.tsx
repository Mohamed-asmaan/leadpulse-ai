"use client";

export function LinearGauge({
  label,
  value,
  max,
  format,
  goodIfUnder,
  threshold,
}: {
  label: string;
  value: number;
  max: number;
  format: (v: number) => string;
  goodIfUnder: boolean;
  threshold: number;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const good = goodIfUnder ? value <= threshold : value >= threshold;
  const bar = good ? "from-emerald-600 to-teal-500" : "from-amber-600 to-rose-500";
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-2">
      <div className="flex justify-between gap-3 text-xs">
        <span className="uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground font-semibold">{format(value)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-background border border-border overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Target: {goodIfUnder ? "≤" : "≥"} {format(threshold)} (operational SLA proxy).
      </p>
    </div>
  );
}
