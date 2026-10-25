"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { OsDetailModal } from "@/components/operacional/os-detail";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/cadastros";
import { formatQuoteNumber } from "@/lib/comercial";
import { OS_STATUS, OS_TYPES, addressLine, fmtDate, formatOsNumber, openFromQuote, worksClient, type PendingQuote, type WorkRow, type WorksData } from "@/lib/operacional";

/* ---------- regras de negócio do painel ---------- */

const GESTAO_OBRAS_KEY = "item_9afd38a1-893b-4107-a3ba-62012a229679";
const ACTIVE = [0, 1, 3, 7, 8];
const STATUS_COLOR: Record<number, string> = { 0: "#F7941D", 1: "#E14337", 2: "#A9B6C2", 3: "#7A8B9C", 4: "#008DFF", 5: "#00A972", 6: "#0DB38A", 7: "#7A5AF8", 8: "#00558C" };
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const GROUPS: Record<string, { label: string; test: (w: WorkRow) => boolean }> = {
  execucao: { label: "Em execução", test: (w) => ACTIVE.includes(w.status) },
  fechamento: { label: "Prontas para fechar", test: (w) => [0, 1, 8].includes(w.status) && w.pendencies === 0 },
  fechadas: { label: "Fechadas", test: (w) => w.status === 4 },
  faturadas: { label: "Faturadas", test: (w) => w.status === 5 || w.status === 6 },
  atraso: { label: "Em atraso", test: (w) => w.status === 1 },
  semTecnico: { label: "Sem técnico", test: (w) => ACTIVE.includes(w.status) && !w.checklist.technician },
  semAgenda: { label: "Sem agendamento", test: (w) => ACTIVE.includes(w.status) && !w.checklist.scheduled },
  materiais: { label: "Materiais pendentes", test: (w) => ACTIVE.includes(w.status) && !w.checklist.materials },
  semFotos: { label: "Sem fotos", test: (w) => ACTIVE.includes(w.status) && !w.checklist.photos },
};
const CHECKS: { key: keyof WorkRow["checklist"]; label: string; icon: string }[] = [
  { key: "technician", label: "Técnico atribuído", icon: "engineering" }, { key: "scheduled", label: "Atendimento agendado", icon: "event" }, { key: "items", label: "Itens lançados", icon: "list_alt" },
  { key: "materials", label: "Materiais entregues", icon: "inventory_2" }, { key: "photos", label: "Fotos anexadas", icon: "photo_camera" }, { key: "onTime", label: "Dentro do prazo", icon: "schedule" },
];

type Filters = { q: string; from: string; until: string; type: string; technician: string; seller: string; status: string; group: string; defect: string; client: string; month: string; onlyActive: boolean };
const NONE: Filters = { q: "", from: "", until: "", type: "", technician: "", seller: "", status: "", group: "", defect: "", client: "", month: "", onlyActive: true };

const compact = (n: number) => (Math.abs(n) >= 1e6 ? `R$ ${(n / 1e6).toFixed(1).replace(".", ",")} mi` : Math.abs(n) >= 1e3 ? `R$ ${(n / 1e3).toFixed(1).replace(".", ",")} mil` : money(n));
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const monthKey = (iso: string) => new Date(new Date(iso).getTime() - 4 * 3600e3).toISOString().slice(0, 7);
const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* ---------- peças visuais ---------- */

function ExcelIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-[22px] w-[22px]"><rect x="11" y="3" width="19" height="26" rx="2.5" fill="#185C37" /><path d="M19 3h8.5A2.5 2.5 0 0 1 30 5.5V11H19z" fill="#33C481" /><rect x="19" y="11" width="11" height="8" fill="#21A366" /><path d="M19 19h11v5.5a2.5 2.5 0 0 1-2.5 2.5H19z" fill="#107C41" /><rect x="1" y="8" width="16" height="16" rx="2.5" fill="#107C41" /><path d="M5.2 11.5h2.6l1.5 3 1.5-3h2.6l-2.9 4.5 3 4.5h-2.7l-1.5-3.1-1.5 3.1H5.2l3-4.5z" fill="#fff" /></svg>
  );
}

function Card({ title, subtitle, children, action, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-ds-primary-deep">{title}</h2>{subtitle && <p className="text-xs text-ds-text-secondary">{subtitle}</p>}</div>{action}</header>
      {children}
    </section>
  );
}

function Kpi({ icon, label, value, hint, tone = "#00355A", active, onClick, delta }: { icon: string; label: string; value: string; hint?: string; tone?: string; active?: boolean; onClick?: () => void; delta?: { text: string; good: boolean } }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ds-text-secondary"><span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${tone}18`, color: tone }}><Icon name={icon} className="text-[17px]" /></span>{label}</span>
      <span className="mt-3 block text-[26px] font-extrabold leading-none tracking-tight" style={{ color: tone }}>{value}</span>
      <span className="mt-1.5 flex items-center gap-2 text-xs text-ds-text-secondary">{hint}{delta && <span className={`rounded-full px-1.5 py-0.5 font-semibold ${delta.good ? "bg-ds-success/10 text-ds-success" : "bg-ds-danger-bg text-ds-danger-text"}`}>{delta.text}</span>}</span>
    </>
  );
  const cls = `rounded-2xl border bg-white p-4 text-left shadow-sm transition-all ${active ? "border-ds-primary-deep ring-2 ring-ds-primary-deep/20" : "border-ds-border-subtle"} ${onClick ? "hover:-translate-y-0.5 hover:border-ds-primary hover:shadow-md" : ""}`;
  return onClick ? <button type="button" onClick={onClick} aria-pressed={active} className={cls}>{body}</button> : <div className={cls}>{body}</div>;
}

function Donut({ data, onPick, active }: { data: { key: string; label: string; value: number; color: string }[]; onPick: (key: string) => void; active: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  const R = 54, C = 2 * Math.PI * R;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-label="Distribuição por situação">
        {data.map((d) => { const len = (d.value / total) * C; const el = <circle key={d.key} cx="70" cy="70" r={R} fill="none" stroke={d.color} strokeWidth={active === d.key ? 26 : 20} strokeDasharray={`${Math.max(len - 1.5, 0)} ${C}`} strokeDashoffset={-acc} className="cursor-pointer transition-all" onClick={() => onPick(d.key)}><title>{d.label}: {d.value}</title></circle>; acc += len; return el; })}
        <text x="70" y="66" textAnchor="middle" className="rotate-90 origin-center fill-ds-primary-deep text-[22px] font-extrabold" transform="rotate(90 70 70)">{total === 1 && !data.length ? 0 : data.reduce((s, d) => s + d.value, 0)}</text>
        <text x="70" y="84" textAnchor="middle" className="fill-ds-text-secondary text-[9px]" transform="rotate(90 70 70)">obras</text>
      </svg>
      <ul className="grid w-full gap-1 text-sm">{data.map((d) => (
        <li key={d.key}><button type="button" onClick={() => onPick(d.key)} aria-pressed={active === d.key} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-ds-bg ${active === d.key ? "bg-ds-bg font-semibold" : ""}`}><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /><span className="flex-1 truncate text-ds-text-muted">{d.label}</span><strong className="text-ds-primary-deep">{d.value}</strong><span className="w-9 text-right text-xs text-ds-text-secondary">{pct(d.value, total)}%</span></button></li>
      ))}</ul>
    </div>
  );
}

function HBars({ rows, format = String, color = "#00355A", onPick, active, empty = "Sem dados no filtro atual." }: { rows: { key: string; label: string; value: number; sub?: string; extra?: number }[]; format?: (n: number) => string; color?: string; onPick?: (key: string) => void; active?: string; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-8 text-center text-sm text-ds-text-secondary">{empty}</p>;
  return (
    <ul className="space-y-2">{rows.map((r) => (
      <li key={r.key}>
        <button type="button" disabled={!onPick} onClick={() => onPick?.(r.key)} aria-pressed={active === r.key} className={`group block w-full rounded-lg px-2 py-1.5 text-left ${onPick ? "hover:bg-ds-bg" : ""} ${active === r.key ? "bg-ds-bg" : ""}`}>
          <span className="mb-1 flex items-baseline justify-between gap-2 text-xs"><span className="truncate font-medium text-ds-text-muted">{r.label}{r.sub && <span className="ml-1.5 font-normal text-ds-text-secondary">{r.sub}</span>}</span><strong className="shrink-0 text-ds-primary-deep">{format(r.value)}</strong></span>
          <span className="relative block h-2 overflow-hidden rounded-full bg-ds-bg"><span className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${(r.value / max) * 100}%`, background: color }} />{r.extra ? <span className="absolute inset-y-0 left-0 rounded-full bg-ds-danger" style={{ width: `${(r.extra / max) * 100}%` }} /> : null}</span>
        </button>
      </li>
    ))}</ul>
  );
}

function Funnel({ stages, active, onPick }: { stages: { key: string; label: string; count: number; value: number; color: string; hint?: string }[]; active: string; onPick: (key: string) => void }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <ol className="space-y-2.5">{stages.map((s, i) => (
      <li key={s.key}>
        <button type="button" onClick={() => onPick(s.key)} aria-pressed={active === s.key} className={`w-full rounded-xl border p-3 text-left transition-all hover:border-ds-primary ${active === s.key ? "border-ds-primary-deep bg-ds-bg" : "border-ds-border-subtle"}`}>
          <span className="flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: s.color }}>{i + 1}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ds-primary-deep">{s.label}</span>{s.hint && <span className="block text-[11px] text-ds-text-secondary">{s.hint}</span>}</span>
            <span className="text-right"><strong className="block text-lg leading-none text-ds-primary-deep">{s.count}</strong><span className="text-[11px] text-ds-text-secondary">{compact(s.value)}</span></span></span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ds-bg"><span className="block h-full rounded-full" style={{ width: `${(s.count / max) * 100}%`, background: s.color }} /></span>
        </button>
      </li>
    ))}</ol>
  );
}

function MonthlyChart({ data, active, onPick }: { data: { key: string; label: string; opened: number; closed: number; value: number }[]; active: string; onPick: (key: string) => void }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.opened, d.closed]));
  if (!data.length) return <p className="py-8 text-center text-sm text-ds-text-secondary">Sem dados no filtro atual.</p>;
  return (
    <div>
      <div className="flex h-44 items-end gap-3" role="group" aria-label="Aberturas e fechamentos por mês">
        {data.map((d) => (
          <button key={d.key} type="button" onClick={() => onPick(d.key)} aria-pressed={active === d.key} title={`${d.label}: ${d.opened} abertas, ${d.closed} fechadas, ${money(d.value)}`} className={`group flex h-full flex-1 flex-col justify-end gap-1 rounded-lg px-1 pb-1 hover:bg-ds-bg ${active === d.key ? "bg-ds-bg ring-1 ring-ds-primary-deep/30" : ""}`}>
            <span className="flex flex-1 items-end justify-center gap-1">
              <span className="relative w-1/2 max-w-6 rounded-t bg-ds-primary-deep" style={{ height: `${(d.opened / max) * 100}%`, minHeight: d.opened ? 3 : 0 }}><span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-ds-primary-deep">{d.opened || ""}</span></span>
              <span className="relative w-1/2 max-w-6 rounded-t bg-ds-success" style={{ height: `${(d.closed / max) * 100}%`, minHeight: d.closed ? 3 : 0 }}><span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-ds-success">{d.closed || ""}</span></span>
            </span>
            <span className="text-center text-[11px] font-semibold uppercase text-ds-text-secondary">{d.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 flex gap-4 text-[11px] text-ds-text-secondary"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ds-primary-deep" />Abertas</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ds-success" />Fechadas</span></p>
    </div>
  );
}

/* ---------- página ---------- */

function Dashboard() {
  const [data, setData] = useState<WorksData | null>(null);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [f, setF] = useState<Filters>(() => {
    if (typeof window === "undefined") return NONE;
    const q = new URLSearchParams(window.location.search);
    const group = q.get("grupo") ?? "";
    return { ...NONE, group: group in GROUPS ? group : "", status: q.get("status") ?? "", technician: q.get("tecnico") ?? "", type: q.get("tipo") ?? "" };
  });
  // Quando chega com um filtro na URL (vindo da Visão Geral), leva direto para a lista filtrada.
  useEffect(() => { if (data && new URLSearchParams(window.location.search).has("grupo")) document.getElementById("checklist-obras")?.scrollIntoView({ block: "start" }); }, [data === null]); // eslint-disable-line react-hooks/exhaustive-deps
  const [openId, setOpenId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: "risk", desc: true });
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const set = (patch: Partial<Filters>) => { setF((c) => ({ ...c, ...patch })); setPage(1); };
  const toggle = (patch: Partial<Filters>) => { const key = Object.keys(patch)[0] as keyof Filters; set(f[key] === patch[key] ? { [key]: "" } : patch); };

  const load = useCallback(() => worksClient().then((d) => { setData(d); setError(""); }).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")), []);
  useEffect(() => { void load(); const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000); return () => clearInterval(t); }, [load]);

  const all = data?.works ?? [];
  const options = useMemo(() => {
    const uniq = (v: string[]) => [...new Set(v)].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return { technicians: uniq(all.flatMap((w) => w.technicians)), sellers: uniq(all.flatMap((w) => w.sellers)) };
  }, [all]);

  // Base filtrada (sem o filtro "grupo/status", para os gráficos poderem mostrar o todo e destacar a seleção).
  const matches = useCallback((w: WorkRow, skip: (keyof Filters)[] = []) => {
    const has = (k: keyof Filters) => !skip.includes(k);
    if (has("q") && f.q) { const t = norm(f.q); if (!norm(`${formatOsNumber(w.number)} ${w.number} ${w.personName} ${w.personNickname ?? ""} ${addressLine(w.address)} ${w.defect ?? ""} ${w.technicians.join(" ")}`).includes(t)) return false; }
    if (has("from") && f.from && w.openedAt.slice(0, 10) < f.from) return false;
    if (has("until") && f.until && w.openedAt.slice(0, 10) > f.until) return false;
    if (has("type") && f.type && String(w.type) !== f.type) return false;
    if (has("technician") && f.technician && !w.technicians.includes(f.technician)) return false;
    if (has("seller") && f.seller && !w.sellers.includes(f.seller)) return false;
    if (has("status") && f.status && String(w.status) !== f.status) return false;
    if (has("defect") && f.defect && w.defect !== f.defect) return false;
    if (has("client") && f.client && w.personName !== f.client) return false;
    if (has("month") && f.month && monthKey(w.openedAt) !== f.month) return false;
    if (has("group") && f.group && !GROUPS[f.group].test(w)) return false;
    return true;
  }, [f]);

  const rows = useMemo(() => all.filter((w) => matches(w)), [all, matches]);
  const active = useMemo(() => rows.filter((w) => ACTIVE.includes(w.status)), [rows]);

  const kpi = useMemo(() => {
    const pipelineQuotes = data?.pendingQuotes ?? [];
    const open = active, late = rows.filter(GROUPS.atraso.test);
    const ready = rows.filter(GROUPS.fechamento.test);
    const qty = open.reduce((s, w) => s + w.qty, 0), del = open.reduce((s, w) => s + w.delivered, 0);
    const done = rows.filter((w) => [4, 5, 6].includes(w.status) && w.closedAt);
    const onTime = done.filter((w) => !w.scheduleEnd || new Date(w.closedAt!) <= new Date(w.scheduleEnd));
    const days = done.length ? done.reduce((s, w) => s + (new Date(w.closedAt!).getTime() - new Date(w.openedAt).getTime()) / 864e5, 0) / done.length : 0;
    return {
      active: open.length, activeValue: open.reduce((s, w) => s + w.total, 0), late: late.length, lateValue: late.reduce((s, w) => s + w.total, 0), ready: ready.length,
      billed: rows.filter(GROUPS.faturadas.test).reduce((s, w) => s + w.total, 0), billedCount: rows.filter(GROUPS.faturadas.test).length,
      materials: pct(del, qty), pendingUnits: qty - del, onTime: pct(onTime.length, done.length), doneCount: done.length, days: Math.round(days * 10) / 10,
      pipeline: pipelineQuotes.reduce((s, q) => s + q.total, 0), pipelineCount: pipelineQuotes.length,
    };
  }, [rows, active, data]);

  const statusData = useMemo(() => {
    const base = all.filter((w) => matches(w, ["status", "group"]));
    const m = new Map<number, number>(); for (const w of base) m.set(w.status, (m.get(w.status) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([s, value]) => ({ key: String(s), label: OS_STATUS[s]?.label ?? String(s), value, color: STATUS_COLOR[s] ?? "#7A8B9C" }));
  }, [all, matches]);

  const funnel = useMemo(() => {
    const base = all.filter((w) => matches(w, ["status", "group"]));
    const sum = (list: WorkRow[]) => list.reduce((s, w) => s + w.total, 0);
    const pq = data?.pendingQuotes ?? [];
    return [
      { key: "__quotes", label: "Vendas fechadas, sem OS aberta", count: pq.length, value: pq.reduce((s, q) => s + q.total, 0), color: "#F7941D", hint: "A abrir — ação comercial/operacional" },
      { key: "execucao", label: "Em execução", count: base.filter(GROUPS.execucao.test).length, value: sum(base.filter(GROUPS.execucao.test)), color: "#00558C", hint: "OS abertas, interrompidas ou em atendimento" },
      { key: "fechamento", label: "Prontas para fechar", count: base.filter(GROUPS.fechamento.test).length, value: sum(base.filter(GROUPS.fechamento.test)), color: "#7A5AF8", hint: "Sem nenhuma pendência" },
      { key: "fechadas", label: "Fechadas", count: base.filter(GROUPS.fechadas.test).length, value: sum(base.filter(GROUPS.fechadas.test)), color: "#008DFF", hint: "Aguardando faturamento" },
      { key: "faturadas", label: "Faturadas", count: base.filter(GROUPS.faturadas.test).length, value: sum(base.filter(GROUPS.faturadas.test)), color: "#00A972", hint: "Ciclo concluído" },
    ];
  }, [all, matches, data]);

  const monthly = useMemo(() => {
    const base = all.filter((w) => matches(w, ["month", "status", "group"]));
    const m = new Map<string, { opened: number; closed: number; value: number }>();
    const row = (k: string) => m.get(k) ?? { opened: 0, closed: 0, value: 0 };
    for (const w of base) { if (w.status !== 2) { const k = monthKey(w.openedAt); const r = row(k); r.opened++; r.value += w.total; m.set(k, r); } if (w.closedAt && [4, 5, 6].includes(w.status)) { const k = monthKey(w.closedAt); const r = row(k); r.closed++; m.set(k, r); } }
    return [...m.entries()].sort().slice(-8).map(([key, v]) => ({ key, label: `${MONTHS[Number(key.slice(5)) - 1]}/${key.slice(2, 4)}`, ...v }));
  }, [all, matches]);

  const byTech = useMemo(() => {
    const m = new Map<string, { n: number; late: number }>();
    for (const w of active) for (const t of w.technicians.length ? w.technicians : ["Sem técnico"]) { const r = m.get(t) ?? { n: 0, late: 0 }; r.n++; if (w.status === 1) r.late++; m.set(t, r); }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n).map(([key, v]) => ({ key, label: key, value: v.n, extra: v.late, sub: v.late ? `${v.late} em atraso` : undefined }));
  }, [active]);
  const byDefect = useMemo(() => { const m = new Map<string, number>(); for (const w of rows) m.set(w.defect ?? "Não informado", (m.get(w.defect ?? "Não informado") ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([key, value]) => ({ key, label: key, value })); }, [rows]);
  const byClient = useMemo(() => { const m = new Map<string, number>(); for (const w of rows.filter((x) => x.status !== 2)) m.set(w.personName, (m.get(w.personName) ?? 0) + w.total); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([key, value]) => ({ key, label: key, value })); }, [rows]);
  const byType = useMemo(() => { const m = new Map<number, number>(); for (const w of rows) m.set(w.type, (m.get(w.type) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([t, value]) => ({ key: String(t), label: OS_TYPES[t] ?? "—", value })); }, [rows]);

  // Análises automáticas (leitura executiva): cada uma filtra a lista ao clicar.
  const insights = useMemo(() => {
    const out: { tone: "danger" | "warning" | "info" | "success"; icon: string; text: React.ReactNode; group?: string }[] = [];
    const late = active.filter((w) => w.status === 1);
    if (late.length) { const worst = [...late].sort((a, b) => b.lateDays - a.lateDays)[0]; out.push({ tone: "danger", icon: "alarm", group: "atraso", text: <><strong>{late.length} obras em atraso</strong> somando {compact(late.reduce((s, w) => s + w.total, 0))}. A mais crítica é a {formatOsNumber(worst.number)} ({worst.personName}), com {worst.lateDays} dias.</> }); }
    const noTech = active.filter((w) => !w.checklist.technician);
    if (noTech.length) out.push({ tone: "warning", icon: "engineering", group: "semTecnico", text: <><strong>{noTech.length} obras sem técnico</strong> atribuído — sem responsável, o prazo não tem dono.</> });
    const mat = active.filter((w) => !w.checklist.materials);
    if (mat.length) out.push({ tone: "warning", icon: "inventory_2", group: "materiais", text: <><strong>{kpi.pendingUnits} unidades de material</strong> ainda não entregues em {mat.length} obras ({100 - kpi.materials}% do total previsto).</> });
    const ns = active.filter((w) => !w.checklist.scheduled);
    if (ns.length) out.push({ tone: "info", icon: "event_busy", group: "semAgenda", text: <><strong>{ns.length} obras sem agendamento</strong> — sem data, não entram na agenda técnica.</> });
    if (kpi.pipelineCount) out.push({ tone: "info", icon: "request_quote", group: "", text: <><strong>{kpi.pipelineCount} orçamentos ganhos</strong> ({compact(kpi.pipeline)}) ainda sem OS aberta — receita parada na fila.</> });
    if (kpi.ready) out.push({ tone: "success", icon: "task_alt", group: "fechamento", text: <><strong>{kpi.ready} obras prontas para fechar</strong> — sem pendências, falta só o fechamento para faturar.</> });
    return out;
  }, [active, kpi]);

  // Tabela (checklist)
  const risk = (w: WorkRow) => (ACTIVE.includes(w.status) ? w.lateDays * 2 + (6 - Object.values(w.checklist).filter(Boolean).length) * 5 + w.pendencies * 3 : -1);
  const progress = (w: WorkRow) => pct(Object.values(w.checklist).filter(Boolean).length, 6);
  const table = useMemo(() => {
    const list = rows.filter((w) => (f.group || f.status ? true : f.onlyActive ? ACTIVE.includes(w.status) : true));
    const get: Record<string, (w: WorkRow) => number | string> = { risk, number: (w) => w.number, client: (w) => w.personName.toLowerCase(), schedule: (w) => (w.scheduleEnd ? +new Date(w.scheduleEnd) : 0), value: (w) => w.total, progress, materials: (w) => (w.qty ? w.delivered / w.qty : 1) };
    const g = get[sort.key] ?? get.risk;
    return [...list].sort((a, b) => { const x = g(a), y = g(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort.desc ? -1 : 1); });
  }, [rows, f.group, f.status, f.onlyActive, sort]);
  const PAGE = 12;
  const pages = Math.max(1, Math.ceil(table.length / PAGE));
  const visible = table.slice((page - 1) * PAGE, page * PAGE);

  const chips: { label: string; clear: () => void }[] = [
    f.group && { label: GROUPS[f.group]?.label ?? f.group, clear: () => set({ group: "" }) }, f.status && { label: `Situação: ${OS_STATUS[Number(f.status)]?.label}`, clear: () => set({ status: "" }) },
    f.type && { label: `Tipo: ${OS_TYPES[Number(f.type)]}`, clear: () => set({ type: "" }) }, f.technician && { label: `Técnico: ${f.technician}`, clear: () => set({ technician: "" }) },
    f.seller && { label: `Vendedor: ${f.seller}`, clear: () => set({ seller: "" }) }, f.defect && { label: `Motivo: ${f.defect}`, clear: () => set({ defect: "" }) },
    f.client && { label: `Cliente: ${f.client}`, clear: () => set({ client: "" }) }, f.month && { label: `Mês: ${MONTHS[Number(f.month.slice(5)) - 1]}/${f.month.slice(2, 4)}`, clear: () => set({ month: "" }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];
  const dirty = chips.length > 0 || f.q || f.from || f.until;

  function exportCsv() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ["OS;Cliente;Tipo;Situação;Abertura;Previsão;Dias de atraso;Técnicos;Materiais entregues;Itens;Fotos;Progresso do checklist;Valor", ...table.map((w) => [formatOsNumber(w.number), esc(w.personName), OS_TYPES[w.type] ?? "", OS_STATUS[w.status]?.label ?? "", fmtDate(w.openedAt), fmtDate(w.scheduleEnd), w.lateDays, esc(w.technicians.join(", ")), `${w.delivered}/${w.qty}`, w.serviceCount + w.productCount, w.attachments, `${progress(w)}%`, w.total.toFixed(2).replace(".", ",")].join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "gestao-de-obras.csv"; a.click(); URL.revokeObjectURL(url);
  }

  async function openQuote(q: PendingQuote) {
    setBusy(q.id);
    try { const os = await openFromQuote(q.id); await load(); setOpenId(os.id); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível abrir a OS."); } finally { setBusy(null); }
  }
  const sortBy = (key: string) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key === "risk" || key === "value" || key === "progress" ? true : false }));
  const th = (key: string, label: string, cls = "") => <th className={cls}><button type="button" onClick={() => sortBy(key)} className="inline-flex items-center gap-1 font-bold uppercase">{label}<Icon name={sort.key === key ? (sort.desc ? "arrow_downward" : "arrow_upward") : "unfold_more"} className={`text-[14px] ${sort.key === key ? "" : "opacity-50"}`} /></button></th>;
  const selectCls = "h-10 w-full min-w-0 rounded-[10px] sm:w-auto border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";

  return (
    <div className="mx-auto max-w-[1400px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Gestão de Obras" }]} />
      <header className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <h1 className="flex w-full items-center gap-3 text-2xl font-extrabold tracking-tight text-ds-primary-deep md:w-auto"><Icon name="engineering" className="!text-[32px]" />Gestão de Obras</h1>
        <button type="button" onClick={() => void load()} aria-label="Atualizar" className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#F7941D] px-3.5 text-sm font-bold text-white transition-colors hover:bg-[#E5850F]"><Icon name="refresh" className="text-[18px]" />Atualizar</button>
        <button type="button" onClick={exportCsv} disabled={!table.length} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#12A262] pl-1.5 pr-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#0E8F55] disabled:opacity-40 md:ml-auto">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white"><ExcelIcon /></span>Exportar
        </button>
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3.5 text-sm font-bold transition-colors ${filtersOpen ? "border-ds-primary-deep bg-ds-primary-deep text-white" : "border-ds-border bg-white text-ds-text-muted hover:border-ds-primary"}`}><Icon name="filter_list" className="text-[18px]" />Filtrar{chips.length > 0 && <span className={`rounded-full px-1.5 text-xs ${filtersOpen ? "bg-white/20" : "bg-ds-primary/10 text-ds-primary"}`}>{chips.length}</span>}</button>
        <p className="order-last w-full text-sm text-ds-text-secondary">Visão executiva da carteira de obras.{data && <span className="ml-2 text-xs">Atualizado às {new Date(data.generatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}</p>
      </header>
      {error && <p role="alert" className="mb-4 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}

      {/* Filtros */}
      {(filtersOpen || chips.length > 0) && <div className="sm:sticky sm:top-0 z-20 mb-5 rounded-2xl border border-ds-border-subtle bg-white/95 p-3 shadow-sm backdrop-blur">
        {filtersOpen && <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" /><Input type="search" value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Buscar obra por número, cliente, endereço, motivo ou técnico..." className="h-10 pl-10" aria-label="Buscar obras" /></div>
          <div className="flex w-full items-center gap-1.5 text-sm text-ds-text-muted sm:w-auto"><span className="hidden lg:inline">Aberta entre</span><Input type="date" aria-label="De" value={f.from} onChange={(e) => set({ from: e.target.value })} className="h-10 min-w-0 flex-1 sm:w-38 sm:flex-none" /><span>e</span><Input type="date" aria-label="Até" value={f.until} onChange={(e) => set({ until: e.target.value })} className="h-10 min-w-0 flex-1 sm:w-38 sm:flex-none" /></div>
          <select aria-label="Tipo" className={selectCls} value={f.type} onChange={(e) => set({ type: e.target.value })}><option value="">Todos os tipos</option>{Object.entries(OS_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select aria-label="Técnico" className={selectCls} value={f.technician} onChange={(e) => set({ technician: e.target.value })}><option value="">Todos os técnicos</option>{options.technicians.map((t) => <option key={t}>{t}</option>)}</select>
          <select aria-label="Vendedor" className={selectCls} value={f.seller} onChange={(e) => set({ seller: e.target.value })}><option value="">Todos os vendedores</option>{options.sellers.map((t) => <option key={t}>{t}</option>)}</select>
          {dirty && <button type="button" onClick={() => setF({ ...NONE, onlyActive: f.onlyActive })} className="h-10 rounded-[10px] px-3 text-sm font-semibold text-ds-primary hover:bg-ds-bg">Limpar filtros</button>}
        </div>}
        {chips.length > 0 && <ul className={`flex flex-wrap gap-1.5 ${filtersOpen ? "mt-2" : ""}`} aria-label="Filtros ativos">{chips.map((c) => <li key={c.label}><button type="button" onClick={c.clear} className="inline-flex items-center gap-1 rounded-full bg-ds-primary-deep px-2.5 py-1 text-xs font-semibold text-white">{c.label}<Icon name="close" className="text-[14px]" /></button></li>)}</ul>}
      </div>}

      {!data ? <p className="py-16 text-center text-sm text-ds-text-secondary">Carregando painel...</p> : (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi icon="construction" label="Obras em andamento" value={String(kpi.active)} hint={compact(kpi.activeValue)} active={f.group === "execucao"} onClick={() => toggle({ group: "execucao" })} />
            <Kpi icon="alarm" label="Atrasadas" value={String(kpi.late)} hint={compact(kpi.lateValue)} tone="#E14337" active={f.group === "atraso"} onClick={() => toggle({ group: "atraso" })} delta={kpi.active ? { text: `${pct(kpi.late, kpi.active)}% das ativas`, good: pct(kpi.late, kpi.active) < 15 } : undefined} />
            <Kpi icon="task_alt" label="Prontas para fechar" value={String(kpi.ready)} hint="sem pendências" tone="#7A5AF8" active={f.group === "fechamento"} onClick={() => toggle({ group: "fechamento" })} />
            <Kpi icon="payments" label="Faturado" value={compact(kpi.billed)} hint={`${kpi.billedCount} obras`} tone="#00A972" active={f.group === "faturadas"} onClick={() => toggle({ group: "faturadas" })} />
            <Kpi icon="inventory_2" label="Materiais entregues" value={`${kpi.materials}%`} hint={`${kpi.pendingUnits} un. pendentes`} tone="#F7941D" active={f.group === "materiais"} onClick={() => toggle({ group: "materiais" })} delta={{ text: kpi.materials >= 70 ? "no ritmo" : "atenção", good: kpi.materials >= 70 }} />
            <Kpi icon="schedule" label="Entregas no prazo" value={kpi.doneCount ? `${kpi.onTime}%` : "—"} hint={`${String(kpi.days).replace(".", ",")} dias em média · ${kpi.doneCount} concluídas`} tone="#008DFF" delta={kpi.doneCount ? { text: kpi.onTime >= 80 ? "saudável" : "abaixo da meta", good: kpi.onTime >= 80 } : undefined} />
          </div>

          {/* Análises automáticas */}
          {insights.length > 0 && (
            <Card title="Leitura executiva" subtitle="Alertas gerados automaticamente a partir dos dados do filtro atual">
              <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">{insights.map((i, idx) => {
                const tone = { danger: "border-ds-danger-border bg-ds-danger-bg text-ds-danger-text", warning: "border-[#F7D9A8] bg-[#FFF8EC] text-ds-warning-text", info: "border-ds-border-subtle bg-ds-bg text-ds-text-muted", success: "border-[#BDE8D6] bg-[#EEFBF5] text-[#0e6b4a]" }[i.tone];
                return <li key={idx}><button type="button" disabled={i.group === undefined || i.group === ""} onClick={() => i.group && set({ group: i.group, onlyActive: true })} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm ${tone} ${i.group ? "hover:brightness-95" : "cursor-default"}`}><Icon name={i.icon} className="mt-0.5 text-[20px]" /><span className="flex-1">{i.text}</span>{i.group && <Icon name="arrow_forward" className="mt-0.5 text-[18px] opacity-60" />}</button></li>;
              })}</ul>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1fr_1.2fr]">
            <Card title="Funil da carteira" subtitle="Da venda ganha ao faturamento"><Funnel stages={funnel} active={f.group} onPick={(k) => (k === "__quotes" ? document.getElementById("quotes-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }) : toggle({ group: k }))} /></Card>
            <Card title="Situação das obras" subtitle="Distribuição por status"><Donut data={statusData} active={f.status} onPick={(k) => toggle({ status: k })} /></Card>
            <Card title="Aberturas × fechamentos" subtitle="Últimos meses — clique no mês para filtrar"><MonthlyChart data={monthly} active={f.month} onPick={(k) => toggle({ month: k })} /></Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
            <Card title="Carga por técnico" subtitle="Obras ativas (vermelho = em atraso)"><HBars rows={byTech} color="#00355A" active={f.technician} onPick={(k) => k !== "Sem técnico" && toggle({ technician: k })} /></Card>
            <Card title="Principais motivos" subtitle="Quantidade de obras"><HBars rows={byDefect} color="#7A5AF8" active={f.defect} onPick={(k) => toggle({ defect: k })} /></Card>
            <Card title="Maiores clientes" subtitle="Valor total das obras"><HBars rows={byClient} color="#00A972" format={compact} active={f.client} onPick={(k) => toggle({ client: k })} /></Card>
            <Card title="Tipos de OS" subtitle="Instalação, manutenção, cancelamento"><HBars rows={byType} color="#F7941D" active={f.type} onPick={(k) => toggle({ type: k })} /></Card>
          </div>

          {/* Orçamentos ganhos sem OS */}
          <Card title="Vendas fechadas aguardando ordem de serviço" subtitle={`${data.pendingQuotes.length} orçamentos · ${compact(kpi.pipeline)} em receita parada`} className="scroll-mt-24" action={undefined}>
            <div id="quotes-panel" />
            {data.pendingQuotes.length === 0 ? <p className="py-6 text-center text-sm text-ds-text-secondary">Nenhum orçamento pendente. Toda venda ganha já virou obra.</p> : (
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">{data.pendingQuotes.map((q) => (
                <li key={q.id} className="flex flex-col gap-2 rounded-xl border border-ds-border-subtle p-3 text-sm"><span className="flex items-start justify-between gap-2"><strong className="text-ds-primary-deep">{q.personName}</strong><span className="shrink-0 rounded bg-ds-bg px-1.5 py-0.5 text-[11px] font-bold">{formatQuoteNumber(q.number)}</span></span>
                  <span className="text-xs text-ds-text-secondary">{q.title ?? "Orçamento sem título"} · ganho em {fmtDate(q.wonAt)}</span>
                  <span className="mt-auto flex items-center justify-between"><strong>{money(q.total)}</strong><button type="button" disabled={busy === q.id} onClick={() => void openQuote(q)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#F7941D] px-2.5 text-xs font-semibold text-[#F7941D] hover:bg-[#F7941D] hover:text-white disabled:opacity-50"><Icon name="build" className="text-[15px]" />{busy === q.id ? "Abrindo..." : "Abrir OS"}</button></span></li>
              ))}</ul>
            )}
          </Card>

          {/* Checklist de obras */}
          <div id="checklist-obras" className="scroll-mt-4" />
          <Card title="Checklist de obras" subtitle={`${table.length} ${table.length === 1 ? "obra" : "obras"} no filtro · clique na linha para abrir a obra`}
            action={!f.group && !f.status ? <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ds-text-muted"><input type="checkbox" checked={f.onlyActive} onChange={(e) => set({ onlyActive: e.target.checked })} />Somente ativas</label> : undefined}>
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="border-b border-ds-border-subtle text-left text-[11px] uppercase tracking-wide text-ds-text-secondary"><tr>{th("number", "Obra", "py-2 pr-3")}{th("schedule", "Prazo", "py-2 pr-3")}<th className="py-2 pr-3">Situação</th>{th("materials", "Materiais", "py-2 pr-3")}<th className="py-2 pr-3">Checklist</th>{th("progress", "Progresso", "py-2 pr-3")}{th("risk", "Risco", "py-2 pr-3")}{th("value", "Valor", "py-2 text-right")}</tr></thead>
                <tbody>
                  {visible.map((w) => {
                    const pr = progress(w), r = risk(w);
                    const level = r < 0 ? null : r >= 40 ? { label: "Crítico", cls: "bg-ds-danger-bg text-ds-danger-text" } : r >= 15 ? { label: "Atenção", cls: "bg-[#FFF3DD] text-ds-warning-text" } : { label: "Controlado", cls: "bg-ds-success/10 text-ds-success" };
                    return (
                      <tr key={w.id} onClick={() => setOpenId(w.id)} onKeyDown={(e) => { if (e.key === "Enter") setOpenId(w.id); }} tabIndex={0} className="cursor-pointer border-b border-ds-border-subtle last:border-0 hover:bg-ds-bg focus:bg-ds-bg focus:outline-none">
                        <td className="max-w-[300px] py-3 pr-3"><span className="block truncate font-semibold text-ds-primary-deep"><span className="mr-2 text-ds-primary">{formatOsNumber(w.number)}</span>{w.personName}</span><span className="block truncate text-xs text-ds-text-secondary">{OS_TYPES[w.type]} · {w.defect ?? "Sem motivo"} · {w.technicians.join(", ") || "sem técnico"}</span></td>
                        <td className="whitespace-nowrap py-3 pr-3">{w.scheduleEnd ? fmtDate(w.scheduleEnd) : "—"}{w.lateDays > 0 && <span className="block text-xs font-semibold text-ds-danger-text">{w.lateDays} dias de atraso</span>}</td>
                        <td className="py-3 pr-3"><span className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: `${STATUS_COLOR[w.status]}22`, color: w.status === 2 || w.status === 3 ? "#3C5165" : STATUS_COLOR[w.status] }}>{OS_STATUS[w.status]?.label}</span></td>
                        <td className="py-3 pr-3">{w.qty ? <div className="w-28"><div className="mb-1 flex justify-between text-[11px] text-ds-text-secondary"><span>{w.delivered}/{w.qty} un.</span><span>{pct(w.delivered, w.qty)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-ds-bg"><div className="h-full rounded-full bg-[#F7941D]" style={{ width: `${pct(w.delivered, w.qty)}%` }} /></div></div> : <span className="text-xs text-ds-text-secondary">sem produtos</span>}</td>
                        <td className="py-3 pr-3"><ul className="flex gap-1" aria-label="Checklist">{CHECKS.map((c) => <li key={c.key} title={`${c.label}: ${w.checklist[c.key] ? "ok" : "pendente"}`} className={`flex h-7 w-7 items-center justify-center rounded-lg ${w.checklist[c.key] ? "bg-ds-success/12 text-ds-success" : "bg-ds-danger-bg text-ds-danger-text"}`}><Icon name={w.checklist[c.key] ? c.icon : "close"} className="text-[16px]" /></li>)}</ul></td>
                        <td className="py-3 pr-3"><div className="w-24"><span className="text-xs font-semibold text-ds-primary-deep">{pr}%</span><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ds-bg"><div className="h-full rounded-full" style={{ width: `${pr}%`, background: pr >= 80 ? "#00A972" : pr >= 50 ? "#F7941D" : "#E14337" }} /></div></div></td>
                        <td className="py-3 pr-3">{level ? <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${level.cls}`}>{level.label}</span> : <span className="text-xs text-ds-text-secondary">—</span>}</td>
                        <td className="whitespace-nowrap py-3 text-right font-semibold">{money(w.total)}</td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-ds-text-secondary">Nenhuma obra encontrada com esses filtros.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ds-text-secondary"><span>{table.length ? (page - 1) * PAGE + 1 : 0} a {Math.min(page * PAGE, table.length)} de {table.length}</span>
              <div className="flex items-center gap-1.5"><button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior" className="h-9 w-9 rounded-lg border border-ds-border bg-white disabled:opacity-40"><Icon name="chevron_left" className="text-[18px]" /></button><span className="px-2 text-xs font-semibold">{page} / {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página" className="h-9 w-9 rounded-lg border border-ds-border bg-white disabled:opacity-40"><Icon name="chevron_right" className="text-[18px]" /></button></div></div>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ds-text-secondary">{CHECKS.map((c) => <span key={c.key} className="flex items-center gap-1"><Icon name={c.icon} className="text-[14px]" />{c.label}</span>)}<span>· Risco = dias de atraso + itens do checklist pendentes + pendências de fechamento</span></p>
          </Card>
        </div>
      )}
      {openId && <OsDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => void load()} onEdit={() => setOpenId(null)} />}
    </div>
  );
}

export default function WorksManagementPage() {
  return <PageShell permissionKey={GESTAO_OBRAS_KEY}>{() => <Dashboard />}</PageShell>;
}
