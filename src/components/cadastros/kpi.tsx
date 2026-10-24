"use client";

import { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export type Datum = { label: string; value: number };

const PALETTE = ["var(--ds-primary)", "var(--ds-primary-deep)", "var(--ds-cyan)", "var(--ds-info)", "var(--ds-success)", "var(--ds-warning)"];

export function KpiCard({ icon, label, value, hint, tone = "primary" }: { icon: string; label: string; value: ReactNode; hint?: ReactNode; tone?: "primary" | "success" | "warning" | "info" }) {
  const tones = { primary: "bg-ds-primary/10 text-ds-primary", success: "bg-ds-success/10 text-ds-success", warning: "bg-ds-warning/20 text-ds-warning-text", info: "bg-ds-info/10 text-ds-info" };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ds-border-subtle bg-white p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon name={icon} className="!text-[22px]" /></span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-ds-text-secondary">{label}</p>
        <p className="truncate text-xl font-bold text-ds-primary-deep">{value}</p>
        {hint && <p className="truncate text-xs text-ds-text-secondary">{hint}</p>}
      </div>
    </div>
  );
}

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-ds-border-subtle bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-ds-primary-deep">{title}</h3>
      {children}
    </section>
  );
}

/** Rosca em SVG com legenda. */
export function Donut({ data, format = (n: number) => String(n), percent = false, center }: { data: Datum[]; format?: (n: number) => string; percent?: boolean; center?: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 15.9155;
  let offset = 25;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 42 42" className="h-28 w-28 shrink-0" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")}>
        <circle cx="21" cy="21" r={radius} fill="none" stroke="var(--ds-border-subtle)" strokeWidth="6" />
        {total > 0 && data.map((d, i) => {
          const length = (d.value / total) * 100;
          const circle = <circle key={d.label} cx="21" cy="21" r={radius} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="6" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={offset} />;
          offset -= length;
          return circle;
        })}
        <text x="21" y="22.5" textAnchor="middle" className="fill-[var(--ds-primary-deep)] text-[5px] font-bold">{center ?? total}</text>
      </svg>
      <ul className="min-w-0 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-ds-text-muted">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="truncate">{d.label}</span>
            <strong className="ml-auto pl-2 text-ds-primary-deep">{format(d.value)}{percent && total > 0 && <span className="ml-1 font-normal text-ds-text-secondary">({((d.value / total) * 100).toFixed(1).replace(".", ",")}%)</span>}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barras horizontais proporcionais ao maior valor. */
export function BarList({ data, format = (n: number) => String(n) }: { data: Datum[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="text-xs">
          <div className="mb-1 flex justify-between gap-2 text-ds-text-muted"><span className="truncate">{d.label}</span><strong className="text-ds-primary-deep">{format(d.value)}</strong></div>
          <div className="h-2 overflow-hidden rounded-full bg-ds-bg"><div className="h-full rounded-full bg-ds-primary" style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Colunas verticais (série mensal). */
export function Columns({ data, format = (n: number) => String(n) }: { data: Datum[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-32 items-end gap-2" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-xs font-semibold text-ds-primary-deep">{format(d.value)}</span>
          <div className="w-full rounded-t-md bg-ds-primary" style={{ height: `${Math.max(4, (d.value / max) * 80)}px`, opacity: d.value ? 1 : 0.25 }} />
          <span className="text-[11px] capitalize text-ds-text-secondary">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
