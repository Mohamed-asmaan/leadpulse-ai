import type { ReactNode } from "react";

export function Notice({
  variant = "default",
  children,
}: {
  variant?: "default" | "warning" | "info";
  children: ReactNode;
}) {
  const styles =
    variant === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : variant === "info"
        ? "border-sky-200 bg-sky-50 text-sky-900"
        : "border-border bg-muted/30 text-muted-foreground";
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${styles}`}>{children}</div>
  );
}
