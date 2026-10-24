"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { OsDetailModal } from "@/components/operacional/os-detail";
import { Icon } from "@/components/ui/icon";
import { OPERACIONAL_KEYS, OS_STATUS, fmtTime, formatOsNumber, osClient, type OsFilters, type OsRow } from "@/lib/operacional";

type View = "month" | "week";
const WEEKDAYS = ["Dom.", "Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sáb."];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function rangeOf(view: View, anchor: Date) {
  if (view === "week") { const from = addDays(startOfDay(anchor), -anchor.getDay()); return { from, until: addDays(from, 7) }; }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const from = addDays(first, -first.getDay());
  return { from, until: addDays(from, 42) };
}

const PILL: Record<number, string> = { 0: "bg-[#F7941D] text-white", 1: "bg-ds-danger text-white", 3: "bg-ds-text-secondary text-white", 4: "bg-ds-info text-white", 5: "bg-ds-success text-white", 6: "bg-ds-success text-white", 7: "bg-ds-warning text-ds-warning-text", 8: "bg-ds-primary-deep text-white" };

function Agenda() {
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [rows, setRows] = useState<OsRow[]>([]);
  const [options, setOptions] = useState<OsFilters | null>(null);
  const [tech, setTech] = useState("");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const { from, until } = useMemo(() => rangeOf(view, anchor), [view, anchor]);

  const load = useCallback(() => osClient.schedule(iso(from), iso(addDays(until, -1))).then(setRows).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")), [from, until]);
  useEffect(() => { void load(); }, [load, reload]);
  useEffect(() => { osClient.filters().then(setOptions).catch(() => {}); }, []);

  const days = Array.from({ length: Math.round((+until - +from) / 864e5) }, (_, i) => addDays(from, i));
  const byDay = useMemo(() => {
    const map = new Map<string, OsRow[]>();
    for (const r of rows) {
      if (tech && !r.technicians.includes(tech)) continue;
      const k = dayKey(new Date(r.scheduleStart!));
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return map;
  }, [rows, tech]);

  const step = (n: number) => setAnchor((a) => (view === "week" ? addDays(a, 7 * n) : new Date(a.getFullYear(), a.getMonth() + n, 1)));
  const title = view === "month" ? anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : `${days[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${days[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
  const today = new Date();

  return (
    <div>
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Agenda Técnica" }]} />
      <h1 className="mb-5 text-xl font-bold text-ds-primary-deep">Agenda Técnica</h1>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-ds-border-subtle bg-white p-4">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} aria-label="Anterior" className="h-9 w-9 rounded-lg border border-ds-border hover:border-ds-primary"><Icon name="chevron_left" className="text-[20px]" /></button>
          <button type="button" onClick={() => setAnchor(startOfDay(new Date()))} className="h-9 rounded-lg border border-ds-border px-3 text-sm font-semibold hover:border-ds-primary">Hoje</button>
          <button type="button" onClick={() => step(1)} aria-label="Próximo" className="h-9 w-9 rounded-lg border border-ds-border hover:border-ds-primary"><Icon name="chevron_right" className="text-[20px]" /></button>
        </div>
        <h2 className="min-w-40 text-base font-bold capitalize text-ds-primary-deep">{title}</h2>
        <select aria-label="Filtrar por técnico" value={tech} onChange={(e) => setTech(e.target.value)} className="ml-auto h-10 rounded-[10px] border border-ds-border bg-white px-3 text-sm"><option value="">Todos os técnicos</option>{options?.technicians.map((t) => <option key={t}>{t}</option>)}</select>
        <div role="group" aria-label="Visualização" className="flex overflow-hidden rounded-[10px] border border-ds-primary-deep text-sm font-semibold">
          {(["month", "week"] as View[]).map((v) => <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`px-4 py-2 ${view === v ? "bg-ds-primary-deep text-white" : "text-ds-primary-deep"}`}>{v === "month" ? "Mês" : "Semana"}</button>)}
        </div>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-ds-border-subtle bg-white">
        <div className="grid min-w-[760px] grid-cols-7 border-b border-ds-border-subtle bg-ds-primary-deep text-center text-xs font-bold uppercase text-white">{WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}</div>
        <div className="grid min-w-[760px] grid-cols-7">
          {days.map((d) => {
            const items = (byDay.get(dayKey(d)) ?? []).sort((a, b) => +new Date(a.scheduleStart!) - +new Date(b.scheduleStart!));
            const dim = view === "month" && d.getMonth() !== anchor.getMonth();
            const limit = view === "month" ? 3 : 12;
            return (
              <div key={dayKey(d)} className={`${view === "week" ? "min-h-72" : "min-h-28"} border-b border-r border-ds-border-subtle p-1.5 ${dim ? "bg-ds-bg/60" : ""}`}>
                <span className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${sameDay(d, today) ? "bg-[#F7941D] text-white" : dim ? "text-ds-text-secondary" : "text-ds-text-muted"}`}>{d.getDate()}</span>
                <ul className="space-y-1">
                  {items.slice(0, limit).map((o) => (
                    <li key={o.id}><button type="button" onClick={() => setOpenId(o.id)} title={`${formatOsNumber(o.number)} · ${o.personName}${o.technicians.length ? ` · ${o.technicians.join(", ")}` : ""} · ${OS_STATUS[o.status]?.label}`} className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${PILL[o.status] ?? "bg-ds-primary text-white"}`}>{fmtTime(o.scheduleStart)} {o.personName}</button></li>
                  ))}
                  {items.length > limit && <li className="px-1 text-[11px] font-semibold text-ds-primary-deep">+{items.length - limit} mais</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-3 text-xs text-ds-text-secondary">{[0, 1, 8, 4, 5].map((s) => <li key={s} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${PILL[s].split(" ")[0]}`} />{OS_STATUS[s].label}</li>)}</ul>
      {openId && <OsDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => setReload((n) => n + 1)} onEdit={() => setOpenId(null)} />}
    </div>
  );
}

export default function TechnicalSchedulePage() {
  return <PageShell permissionKey={OPERACIONAL_KEYS.agenda}>{() => <Agenda />}</PageShell>;
}
