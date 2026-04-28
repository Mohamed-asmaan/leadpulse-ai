import type { ReactNode } from "react";

/** Compact KPI tile used on Overview and similar dashboards. */
export function KpiStat({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex gap-3 shadow-sm">
      {icon}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold text-foreground mt-1">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-1 leading-snug">{hint}</div>
      </div>
    </div>
  );
}
