"use client";

import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/cadastros";
import { quotesClient, type QuoteIndicators } from "@/lib/comercial";
import { PageShell } from "@/components/layout/page-shell";
import { KpiCard } from "@/components/cadastros/kpi";
import { Icon } from "@/components/ui/icon";

const INDICATORS_KEY = "item_40384a7d-463f-4173-90d8-cfad958912ae";

/** Mesma cor para a mesma situação em todos os gráficos. */
const STATUS_COLOR: Record<number, string> = {
  3: "var(--ds-warning)", 4: "var(--ds-info)", 7: "var(--ds-primary)", 8: "var(--ds-success)", 6: "#94a3b8", 2: "var(--ds-danger)",
};
const STATUS_HINT: Record<number, string> = {
  3: "Dentro da validade, aguardando decisão", 4: "Ganhos e liberados, ainda sem ordem de serviço", 7: "Ganhos com ordem de serviço em andamento",
  8: "Ganhos com ordem de serviço finalizada", 6: "Passaram da validade sem decisão", 2: "Recusados pelo cliente ou pela gestão",
};
const WON = [4, 7, 8];
const LOST = [6, 2];

const pad = (n: number) => String(n).padStart(2, "0");
const currentMonth = () => { const d = new Date(Date.now() - 4 * 3600000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };
const shiftMonth = (month: string, delta: number) => { const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + delta, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };
const monthName = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1, 12)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).replace(/^./, (c) => c.toUpperCase());
const percent = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1).replace(".", ",")}%` : "0%");
const compact = (n: number) => (n >= 1000000 ? `R$ ${(n / 1000000).toFixed(1).replace(".", ",")} mi` : n >= 1000 ? `R$ ${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(".", ",")} mil` : money(n));

function variation(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return undefined;
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(0)}% vs. mês anterior`;
}

type Slice = { status: number; label: string; value: number };

/** Rosca interativa: passe o mouse (ou toque) na legenda ou na fatia para destacar. */
function DonutChart({ slices, format, center }: { slices: Slice[]; format: (n: number) => string; center: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const radius = 15.9155;
  let offset = 25;
  const current = active === null ? null : slices[active];
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative w-44 shrink-0 sm:w-48">
        <svg viewBox="0 0 42 42" className="w-full" role="img" aria-label={slices.map((s) => `${s.label}: ${format(s.value)}`).join(", ")}>
          <circle cx="21" cy="21" r={radius} fill="none" stroke="var(--ds-border-subtle)" strokeWidth="5" />
          {slices.map((s, i) => {
            const length = (s.value / total) * 100;
            const circle = (
              <circle key={s.status} cx="21" cy="21" r={radius} fill="none" stroke={STATUS_COLOR[s.status]} strokeWidth={active === i ? 6.5 : 5}
                strokeDasharray={`${Math.max(0, length - 0.4)} ${100 - Math.max(0, length - 0.4)}`} strokeDashoffset={offset} opacity={active === null || active === i ? 1 : 0.35}
                className="cursor-pointer transition-all duration-150" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onClick={() => setActive(active === i ? null : i)} />
            );
            offset -= length;
            return circle;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ds-text-secondary">{current ? current.label : "Total"}</span>
          <span className="text-lg font-bold leading-tight text-ds-primary-deep">{current ? format(current.value) : center}</span>
          <span className="text-xs text-ds-text-secondary">{current ? percent(current.value, total) : ""}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1">
        {slices.map((s, i) => (
          <li key={s.status}>
            <button type="button" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(active === i ? null : i)} title={STATUS_HINT[s.status]}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${active === i ? "bg-ds-bg" : "hover:bg-ds-bg"}`}>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: STATUS_COLOR[s.status] }} />
              <span className="min-w-0 flex-1 truncate text-ds-text-muted">{s.label}</span>
              <strong className="text-ds-primary-deep">{format(s.value)}</strong>
              <span className="w-14 shrink-0 text-right text-xs text-ds-text-secondary">{percent(s.value, total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarsChart({ slices, format }: { slices: Slice[]; format: (n: number) => string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const max = Math.max(1, ...slices.map((s) => s.value));
  return (
    <ul className="space-y-3">
      {slices.map((s) => (
        <li key={s.status} title={STATUS_HINT[s.status]}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2 text-ds-text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s.status] }} />{s.label}</span><span><strong className="text-ds-primary-deep">{format(s.value)}</strong><span className="ml-2 text-xs text-ds-text-secondary">{percent(s.value, total)}</span></span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ds-bg"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${(s.value / max) * 100}%`, background: STATUS_COLOR[s.status] }} /></div>
        </li>
      ))}
    </ul>
  );
}

function ChartPanel({ title, subtitle, slices, format, center }: { title: string; subtitle: string; slices: Slice[]; format: (n: number) => string; center: string }) {
  const [view, setView] = useState<"donut" | "bars">("donut");
  return (
    <section className="rounded-xl border border-ds-border-subtle bg-white p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-ds-primary-deep">{title}</h2><p className="text-xs text-ds-text-secondary">{subtitle}</p></div>
        <div role="group" aria-label="Tipo de gráfico" className="inline-flex overflow-hidden rounded-lg border border-ds-primary-deep">
          {([["donut", "Rosca", "donut_large"], ["bars", "Barras", "bar_chart"]] as const).map(([key, label, icon]) => (
            <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold ${view === key ? "bg-ds-primary-deep text-white" : "bg-white text-ds-primary-deep hover:bg-ds-bg"}`}><Icon name={icon} className="text-[16px]" />{label}</button>
          ))}
        </div>
      </header>
      {slices.length === 0 ? <p className="py-10 text-center text-sm text-ds-text-secondary">Nenhum registro encontrado para o filtro selecionado.</p> : view === "donut" ? <DonutChart slices={slices} format={format} center={center} /> : <BarsChart slices={slices} format={format} />}
    </section>
  );
}

function Indicators() {
  const today = useMemo(currentMonth, []);
  const [month, setMonth] = useState(today);
  const [data, setData] = useState<{ current: QuoteIndicators; previous: QuoteIndicators } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setData(null); setError("");
    Promise.all([quotesClient.indicators(month), quotesClient.indicators(shiftMonth(month, -1))])
      .then(([current, previous]) => { if (active) setData({ current, previous }); })
      .catch((e) => active && setError(e instanceof Error ? e.message : "Não foi possível carregar os indicadores."));
    return () => { active = false; };
  }, [month]);

  const summary = useMemo(() => {
    if (!data) return null;
    const sum = (list: QuoteIndicators, statuses: number[], key: "count" | "value") => list.groups.filter((g) => statuses.includes(g.status)).reduce((s, g) => s + g[key], 0);
    const won = sum(data.current, WON, "count"), lost = sum(data.current, LOST, "count");
    return {
      totalCount: data.current.totalCount, totalValue: data.current.totalValue, openValue: sum(data.current, [3], "value"), openCount: sum(data.current, [3], "count"),
      wonValue: sum(data.current, WON, "value"), wonCount: won, conversion: won + lost > 0 ? (won / (won + lost)) * 100 : 0,
    };
  }, [data]);

  const slices = (key: "count" | "value"): Slice[] => (data?.current.groups ?? []).map((g) => ({ status: g.status, label: g.label, value: g[key] }));

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-ds-primary-deep"><Icon name="monitoring" className="!text-[32px]" />Indicadores de Negócio</h1>
          <p className="mt-1 text-sm text-ds-text-secondary">Acompanhe os orçamentos do mês e compare com o período anterior.</p>
        </div>
        <div className="flex items-center gap-2" role="group" aria-label="Período">
          <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Mês anterior" className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-ds-border bg-white text-ds-text-muted hover:border-ds-primary hover:text-ds-primary"><Icon name="chevron_left" /></button>
          <label className="relative inline-flex h-10 min-w-44 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-ds-border bg-white px-3 text-sm font-semibold text-ds-primary-deep hover:border-ds-primary">
            <Icon name="calendar_month" className="text-[18px]" />{monthName(month)}
            <input type="month" aria-label="Escolher mês" value={month} max={today} onChange={(e) => e.target.value && setMonth(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
          <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} disabled={month >= today} aria-label="Próximo mês" className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-ds-border bg-white text-ds-text-muted hover:border-ds-primary hover:text-ds-primary disabled:cursor-not-allowed disabled:opacity-40"><Icon name="chevron_right" /></button>
          {month !== today && <button type="button" onClick={() => setMonth(today)} className="h-10 rounded-[10px] bg-ds-primary-deep px-3 text-sm font-semibold text-white hover:bg-ds-primary-hover">Mês atual</button>}
        </div>
      </header>

      {error && <p role="alert" className="mb-4 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}

      {!data && !error && (
        <div className="space-y-4" aria-busy="true"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white/70" />)}</div><div className="grid gap-4 lg:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-white/70" />)}</div></div>
      )}

      {data && summary && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon="request_quote" label="Orçamentos no mês" value={summary.totalCount} hint={variation(summary.totalCount, data.previous.totalCount) ?? "sem comparação com o mês anterior"} />
            <KpiCard icon="payments" label="Valor orçado" value={compact(summary.totalValue)} hint={variation(summary.totalValue, data.previous.totalValue) ?? "sem comparação com o mês anterior"} tone="info" />
            <KpiCard icon="pending_actions" label="Em aberto" value={compact(summary.openValue)} hint={`${summary.openCount} aguardando decisão`} tone="warning" />
            <KpiCard icon="verified" label="Ganhos" value={compact(summary.wonValue)} hint={`${summary.wonCount} ganhos · conversão ${summary.conversion.toFixed(0)}%`} tone="success" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartPanel title="Quantidade de Orçamento por Situação" subtitle="Quantos orçamentos estão em cada situação" slices={slices("count")} format={(n) => String(n)} center={String(summary.totalCount)} />
            <ChartPanel title="Valores de Orçamentos por Situação" subtitle="Quanto vale cada situação" slices={slices("value")} format={money} center={compact(summary.totalValue)} />
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-ds-text-secondary">Os orçamentos são contados pelo mês de abertura. Os demais indicadores serão exibidos quando os módulos de Contratos, Faturamento e Financeiro forem implementados.</p>
    </>
  );
}

export default function IndicatorsPage() {
  return <PageShell permissionKey={INDICATORS_KEY}>{() => <Indicators />}</PageShell>;
}
