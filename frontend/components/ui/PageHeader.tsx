import type { ReactNode } from "react";

/**
 * Page title region inspired by Open Mercato's PortalPageHeader (MIT).
 * Large title, optional eyebrow, muted description, action slot.
 */
export function PageHeader({
  label,
  title,
  description,
  action,
}: {
  label?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {label ? (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/80">{label}</p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground sm:text-base max-w-3xl">{description}</p> : null}
      </div>
      {action ? <div className="mt-3 shrink-0 sm:mt-0 flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
