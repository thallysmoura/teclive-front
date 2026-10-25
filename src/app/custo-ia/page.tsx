"use client";

import { useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { getAiUsage, type AiUsageReport } from "@/lib/dashboard";

const usd = (n: number) => `US$ ${n.toLocaleString("en-US", { minimumFractionDigits: n < 1 ? 4 : 2, maximumFractionDigits: n < 1 ? 4 : 2 })}`;
const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: n < 1 ? 4 : 2, maximumFractionDigits: n < 1 ? 4 : 2 })}`;
const int = (n: number) => n.toLocaleString("pt-BR");
const FEATURES: Record<string, string> = { "resumo-executivo": "Resumo executivo (Como estamos?)", chat: "Chat / uso geral", "estimativa-anterior": "Uso anterior ao registro (estimado)" };
const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

function Stat({ icon, label, usdValue, rate, hint, tone }: { icon: string; label: string; usdValue: number; rate: number; hint?: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ds-text-secondary"><span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: tone }}><Icon name={icon} className="text-[18px]" /></span>{label}</p>
      <p className="mt-3 text-2xl font-extrabold leading-none text-ds-primary-deep">{brl(usdValue * rate)}</p>
      <p className="mt-1.5 text-sm font-semibold text-ds-text-muted">{usd(usdValue)}</p>
      {hint && <p className="mt-1 text-xs text-ds-text-secondary">{hint}</p>}
    </div>
  );
}

function Cost() {
  const [data, setData] = useState<AiUsageReport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getAiUsage().then(setData).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")); }, []);

  if (error) return <p role="alert" className="rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>;
  if (!data) return <p className="py-16 text-center text-sm text-ds-text-secondary">Carregando...</p>;
  const r = data.rate.brl;
  const maxDay = Math.max(1e-9, ...data.byDay.map((d) => d.costUsd));
  const tokens = data.total.promptTokens + data.total.completionTokens;

  return (
    <div className="mx-auto max-w-[1100px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Governança" }, { label: "Custo" }]} />
      <header className="mb-5">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-ds-primary-deep"><Icon name="payments" className="!text-[30px]" />Custo da IA</h1>
        <p className="mt-1 text-sm text-ds-text-secondary">Quanto já foi gasto com inteligência artificial no projeto, em reais e dólares (valores estimados pela tabela de preços da OpenAI).</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="account_balance_wallet" label="Total gasto" usdValue={data.total.costUsd} rate={r} tone="#005CD2" hint={data.since ? `desde ${new Date(data.since).toLocaleDateString("pt-BR")}` : undefined} />
        <Stat icon="today" label="Hoje" usdValue={data.today.costUsd} rate={r} tone="#12A262" hint={`${data.today.calls} ${data.today.calls === 1 ? "chamada" : "chamadas"}`} />
        <div className="rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ds-text-secondary"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7941D] text-white"><Icon name="bolt" className="text-[18px]" /></span>Chamadas</p>
          <p className="mt-3 text-2xl font-extrabold leading-none text-ds-primary-deep">{int(data.total.calls)}</p>
          <p className="mt-1.5 text-xs text-ds-text-secondary">consultas à IA</p>
        </div>
        <div className="rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ds-text-secondary"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7A5AF8] text-white"><Icon name="token" className="text-[18px]" /></span>Tokens</p>
          <p className="mt-3 text-2xl font-extrabold leading-none text-ds-primary-deep">{int(tokens)}</p>
          <p className="mt-1.5 text-xs text-ds-text-secondary">{int(data.total.promptTokens)} entrada · {int(data.total.completionTokens)} saída</p>
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-ds-text-secondary"><Icon name="currency_exchange" className="text-[15px]" />Dólar a {brl(r)} — {data.rate.source}.</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-sm font-extrabold text-ds-primary-deep">Por recurso</h2>
          <ul className="space-y-2">{data.byFeature.map((f) => (
            <li key={f.key} className="flex items-center gap-3 rounded-xl bg-ds-bg/60 px-3 py-2.5"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-ds-primary-deep">{FEATURES[f.key] ?? f.key}</span><span className="block text-xs text-ds-text-secondary">{f.calls} {f.calls === 1 ? "chamada" : "chamadas"} · {int(f.promptTokens + f.completionTokens)} tokens</span></span><span className="text-right"><span className="block text-sm font-extrabold text-ds-primary-deep">{brl(f.costUsd * r)}</span><span className="block text-xs text-ds-text-secondary">{usd(f.costUsd)}</span></span></li>
          ))}</ul>
          <h2 className="mb-3 mt-5 text-sm font-extrabold text-ds-primary-deep">Por modelo</h2>
          <ul className="space-y-2">{data.byModel.map((m) => (
            <li key={m.key} className="flex items-center justify-between gap-3 rounded-xl bg-ds-bg/60 px-3 py-2.5 text-sm"><span className="font-semibold text-ds-text-muted">{m.key}</span><span className="font-extrabold text-ds-primary-deep">{brl(m.costUsd * r)} <span className="text-xs font-medium text-ds-text-secondary">({usd(m.costUsd)})</span></span></li>
          ))}</ul>
        </section>

        <section className="rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-sm font-extrabold text-ds-primary-deep">Gasto por dia</h2>
          <ul className="space-y-2">{data.byDay.map((d) => (
            <li key={d.key} className="flex items-center gap-3 text-sm"><span className="w-14 shrink-0 text-xs font-semibold capitalize text-ds-text-secondary">{dayLabel(d.key)}</span><span className="h-3 flex-1 overflow-hidden rounded-full bg-ds-bg"><span className="block h-full rounded-full bg-ds-primary" style={{ width: `${Math.max(3, (d.costUsd / maxDay) * 100)}%` }} /></span><span className="w-24 shrink-0 text-right text-xs font-bold text-ds-primary-deep">{brl(d.costUsd * r)}</span></li>
          ))}</ul>
        </section>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-ds-border-subtle bg-white shadow-sm">
        <h2 className="border-b border-ds-border-subtle px-4 py-3 text-sm font-extrabold text-ds-primary-deep sm:px-5">Últimas chamadas</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-ds-text-secondary"><tr><th className="px-4 py-2 sm:px-5">Quando</th><th className="px-3 py-2">Recurso</th><th className="px-3 py-2 text-right">Tokens</th><th className="px-4 py-2 text-right sm:px-5">Custo</th></tr></thead>
            <tbody>{data.recent.map((c) => (
              <tr key={c.id} className="border-t border-ds-border-subtle"><td className="whitespace-nowrap px-4 py-2 text-ds-text-muted sm:px-5">{new Date(c.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td><td className="px-3 py-2 text-ds-text">{FEATURES[c.feature] ?? c.feature}</td><td className="px-3 py-2 text-right tabular-nums text-ds-text-muted">{int(c.promptTokens + c.completionTokens)}</td><td className="whitespace-nowrap px-4 py-2 text-right font-bold text-ds-primary-deep sm:px-5">{brl(c.costUsd * r)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>
      <p className="mt-3 text-xs leading-relaxed text-ds-text-secondary">O registro começou quando esta tela foi criada; o que foi usado antes aparece como uma estimativa única. Os valores são estimativas com base nos tokens informados pela OpenAI e podem diferir um pouco da fatura.</p>
    </div>
  );
}

export default function AiCostPage() {
  return <PageShell permissionKey="custo_ia">{() => <Cost />}</PageShell>;
}
