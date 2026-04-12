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
      ? "border-amber-900/50 bg-amber-950/25 text-amber-100/90"
      : variant === "info"
        ? "border-sky-900/50 bg-sky-950/25 text-sky-100/90"
        : "border-border bg-muted/30 text-muted-foreground";
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${styles}`}>{children}</div>
  );
}
