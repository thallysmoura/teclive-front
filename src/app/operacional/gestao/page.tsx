"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { money } from "@/lib/cadastros";
import { OPERACIONAL_KEYS, fmtDate, formatOsNumber, managementClient, type Management } from "@/lib/operacional";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function Kpi({ icon, label, value, hint, tone = "text-ds-primary-deep" }: { icon: string; label: string; value: string | number; hint?: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-ds-border-subtle bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ds-text-secondary"><Icon name={icon} className="text-[18px]" />{label}</div>
      <p className={`mt-2 truncate text-xl font-extrabold sm:text-2xl ${tone}`}>{value}</p>
      {hint && <p className="text-xs text-ds-text-secondary">{hint}</p>}
    </div>
  );
}

function Bars({ title, rows, format = (n: number) => String(n), color = "#0A4A7C" }: { title: string; rows: { label: string; value: number }[]; format?: (n: number) => string; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-xl border border-ds-border-subtle bg-white p-4">
      <h2 className="mb-3 text-sm font-bold text-ds-primary-deep">{title}</h2>
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-ds-text-secondary">Sem dados.</p> : (
        <ul className="space-y-2.5">{rows.map((r) => (
          <li key={r.label}><div className="mb-1 flex justify-between text-xs"><span className="truncate pr-2 text-ds-text-muted">{r.label}</span><strong className="text-ds-primary-deep">{format(r.value)}</strong></div>
            <div className="h-2 overflow-hidden rounded-full bg-ds-bg"><div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} /></div></li>
        ))}</ul>
      )}
    </section>
  );
}

function Management() {
  const [data, setData] = useState<Management | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { managementClient().then(setData).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")); }, []);

  return (
    <div>
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Gestão de OS" }]} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ds-primary-deep">Gestão de OS</h1>
        <Link href="/operacional/ordens-servico" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-ds-primary-deep px-4 text-sm font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="list_alt" className="text-[18px]" />Ver todas as OS</Link>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      {!data ? <p className="py-10 text-center text-sm text-ds-text-secondary">Carregando...</p> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi icon="assignment" label="Total de OS" value={data.total} />
            <Kpi icon="pending_actions" label="Em aberto" value={data.open} hint={money(data.openValue)} />
            <Kpi icon="alarm" label="Em atraso" value={data.late} tone={data.late ? "text-ds-danger-text" : "text-ds-primary-deep"} />
            <Kpi icon="payments" label="Valor total" value={money(data.value)} hint="sem canceladas" />
            <Kpi icon="timer" label="Tempo médio" value={`${data.averageCloseDays} dias`} hint="abertura → fechamento" />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Bars title="OS por situação" rows={data.byStatus} />
            <Bars title="OS por tipo" rows={data.byType} color="#12A262" />
            <Bars title="Abertas por técnico" rows={data.byTechnician} color="#F7941D" />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Bars title="Valor por mês de abertura" rows={data.monthly.map((m) => ({ label: `${MONTHS[Number(m.month.slice(5)) - 1]}/${m.month.slice(2, 4)} · ${m.count} OS`, value: m.value }))} format={money} color="#008DFF" />
            <section className="rounded-xl border border-ds-border-subtle bg-white p-4">
              <h2 className="mb-3 text-sm font-bold text-ds-primary-deep">OS em atraso (mais antigas)</h2>
              {data.lateList.length === 0 ? <p className="py-6 text-center text-sm text-ds-text-secondary">Nenhuma OS em atraso.</p> : (
                <ul className="divide-y divide-ds-border-subtle text-sm">{data.lateList.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0"><span className="mr-2 font-semibold text-ds-primary">{formatOsNumber(o.number)}</span><span className="truncate text-ds-text-muted">{o.personName}</span></span><span className="shrink-0 text-xs font-semibold text-ds-danger-text">venceu {fmtDate(o.scheduleEnd)}</span></li>
                ))}</ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagementPage() {
  return <PageShell permissionKey={OPERACIONAL_KEYS.gestao}>{() => <Management />}</PageShell>;
}
