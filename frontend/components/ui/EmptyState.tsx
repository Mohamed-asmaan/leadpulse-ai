import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-2 text-xs text-muted-foreground max-w-md mx-auto">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
