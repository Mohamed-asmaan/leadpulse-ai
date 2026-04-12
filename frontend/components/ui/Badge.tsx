import type { ReactNode } from "react";

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "outline";
  className?: string;
}) {
  const v =
    variant === "success"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
      : variant === "warning"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : variant === "destructive"
          ? "bg-destructive/15 text-destructive border-destructive/40"
          : variant === "outline"
            ? "bg-transparent text-muted-foreground border-border"
            : "bg-primary/15 text-primary border-primary/30";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${v} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
