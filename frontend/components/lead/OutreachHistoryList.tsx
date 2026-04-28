import type { OutreachRow } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

export function OutreachHistoryList({ rows }: { rows: OutreachRow[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No automated outreach rows yet for this lead.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      {rows.map((r) => (
        <li key={r.id} className="px-3 py-2.5 bg-card text-sm space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-foreground capitalize">{r.channel}</span>
            <Badge variant={r.status === "failed" ? "destructive" : r.status === "sent" ? "success" : "outline"}>
              {r.status}
            </Badge>
          </div>
          {r.subject ? <div className="text-xs text-muted-foreground truncate">{r.subject}</div> : null}
          <pre className="text-[11px] text-foreground/90 whitespace-pre-wrap max-h-24 overflow-auto">
            {r.message}
          </pre>
          <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
        </li>
      ))}
    </ul>
  );
}
