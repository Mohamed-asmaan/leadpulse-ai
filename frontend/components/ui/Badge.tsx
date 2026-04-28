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
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : variant === "warning"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : variant === "destructive"
          ? "bg-rose-50 text-rose-800 border-rose-200"
          : variant === "outline"
            ? "bg-card text-foreground border-border"
            : "bg-sky-50 text-sky-800 border-sky-200";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${v} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
