import type { ReactNode } from "react";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`border-b border-border px-4 py-3 md:px-5 ${className}`.trim()}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold tracking-tight text-foreground">{children}</h2>;
}

export function CardContent({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`p-4 md:p-5 ${className}`.trim()}>{children}</div>;
}
