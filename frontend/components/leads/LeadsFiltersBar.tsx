"use client";

import type { LeadListFilters } from "@/lib/leadsFilters";

type Props = {
  filters: LeadListFilters;
  onChange: (f: LeadListFilters) => void;
  onExportCsv: () => void;
  datasetLabel: string;
};

export function LeadsFiltersBar({ filters, onChange, onExportCsv, datasetLabel }: Props) {
  const patch = (partial: Partial<LeadListFilters>) => onChange({ ...filters, ...partial });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Lead pipeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">{datasetLabel}</p>
        </div>
        <button
          type="button"
          onClick={onExportCsv}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-900"
        >
          Export visible CSV
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Field label="Status">
          <select
            value={filters.tier}
            onChange={(e) => patch({ tier: e.target.value })}
            className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-sm"
          >
            <option value="">Any</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </Field>
        <Field label="Source contains">
          <input
            value={filters.source}
            onChange={(e) => patch({ source: e.target.value })}
            placeholder="meta_ads…"
            className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-sm"
          />
        </Field>
        <Field label="Min score">
          <input
            value={filters.minScore}
            onChange={(e) => patch({ minScore: e.target.value })}
            inputMode="numeric"
            placeholder="0"
            className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-sm"
          />
        </Field>
        <Field label="Max score">
          <input
            value={filters.maxScore}
            onChange={(e) => patch({ maxScore: e.target.value })}
            inputMode="numeric"
            placeholder="100"
            className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-sm"
          />
        </Field>
        <Field label="From date">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => patch({ dateFrom: e.target.value })}
            className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-sm"
          />
        </Field>
        <Field label="To date">
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => patch({ dateTo: e.target.value })}
            className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-sm"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
      {label}
      {children}
    </label>
  );
}
