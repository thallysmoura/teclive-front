"use client";

import { useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { getAiUsage, getR2Usage, type AiUsageReport, type R2Usage } from "@/lib/dashboard";

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

const bytesText = (n: number) => (n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(2).replace(".", ",")} GB` : n >= 1024 ** 2 ? `${(n / 1024 ** 2).toFixed(1).replace(".", ",")} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);

function Progress({ percent, label, right }: { percent: number; label: string; right: string }) {
  const tone = percent >= 90 ? "#E5322D" : percent >= 70 ? "#F7941D" : "#12A262";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs"><span className="font-bold text-ds-primary-deep">{label}</span><span className="font-semibold text-ds-text-secondary">{right}</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-ds-bg" role="progressbar" aria-label={label} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(percent > 0 ? 1.5 : 0, Math.min(100, percent))}%`, background: tone }} /></div>
    </div>
  );
}

function R2Costs({ rate }: { rate: number }) {
  const [d, setD] = useState<R2Usage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getR2Usage().then(setD).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")); }, []);
  const pct = d ? (d.percentOfFree < 0.1 ? "<0,1" : d.percentOfFree.toFixed(1).replace(".", ",")) : "";
  return (
    <section className="mt-8">
      <h2 className="mb-1 flex items-center gap-3 text-xl font-extrabold tracking-tight text-ds-primary-deep"><Icon name="cloud" className="!text-[28px] text-[#F6821F]" />Armazenamento de arquivos (Cloudflare R2)</h2>
      <p className="mb-4 text-sm text-ds-text-secondary">Fotos de perfil, capturas das sugestões e fotos das ordens de serviço. O plano gratuito inclui 10 GB de armazenamento por mês.</p>
      {error && <p role="alert" className="rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      {!d && !error && <p className="py-8 text-center text-sm text-ds-text-secondary">Carregando...</p>}
      {d && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ds-text-secondary"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F6821F] text-white"><Icon name="folder_open" className="text-[18px]" /></span>Arquivos</p><p className="mt-3 text-2xl font-extrabold leading-none text-ds-primary-deep">{int(d.files)}</p><p className="mt-1.5 text-xs text-ds-text-secondary">{bytesText(d.bytes)} guardados</p></div>
            <div className="rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ds-text-secondary"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#12A262] text-white"><Icon name="cloud_upload" className="text-[18px]" /></span>Enviados hoje</p><p className="mt-3 text-2xl font-extrabold leading-none text-ds-primary-deep">{int(d.filesToday)}</p><p className="mt-1.5 text-xs text-ds-text-secondary">{bytesText(d.bytesToday)} · {int(d.filesMonth)} no mês</p></div>
            <Stat icon="payments" label="Custo hoje" usdValue={d.costUsd.today} rate={rate} tone="#005CD2" hint={d.costUsd.month === 0 ? "dentro do plano gratuito" : "estimativa do dia"} />
            <Stat icon="calendar_month" label="Custo no mês" usdValue={d.costUsd.month} rate={rate} tone="#7A5AF8" hint={d.costUsd.month === 0 ? "nada a pagar por enquanto" : "armazenamento + operações"} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm sm:p-5">
              <h3 className="mb-4 text-sm font-extrabold text-ds-primary-deep">Quanto falta para o plano gratuito acabar</h3>
              <div className="space-y-5">
                <Progress percent={d.percentOfFree} label="Armazenamento" right={`${bytesText(d.bytes)} de ${d.freeGb} GB (${pct}%)`} />
                <Progress percent={(d.classA.used / d.classA.free) * 100} label="Operações de envio no mês" right={`${int(d.classA.used)} de ${int(d.classA.free)}`} />
              </div>
              <p className="mt-4 rounded-xl bg-ds-bg/70 px-3 py-2.5 text-xs leading-relaxed text-ds-text-muted">
                Ainda cabem cerca de <strong className="text-ds-primary-deep">{d.filesUntilFull === null ? "—" : int(d.filesUntilFull)}</strong> arquivos do tamanho médio atual ({bytesText(d.avgBytes)}) antes de pagar algo, ou seja, {bytesText(d.remainingBytes)} livres. Passando de 10 GB, o excesso custa US$ 0,015 por GB ao mês.
              </p>
            </section>
            <section className="rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm sm:p-5">
              <h3 className="mb-3 text-sm font-extrabold text-ds-primary-deep">Por tipo de arquivo</h3>
              <ul className="space-y-2">{d.folders.map((f) => (
                <li key={f.key} className="flex items-center justify-between gap-3 rounded-xl bg-ds-bg/60 px-3 py-2.5"><span className="min-w-0"><span className="block truncate text-sm font-bold text-ds-primary-deep">{f.label}</span><span className="block text-xs text-ds-text-secondary">{int(f.files)} {f.files === 1 ? "arquivo" : "arquivos"}</span></span><span className="text-sm font-extrabold text-ds-primary-deep">{bytesText(f.bytes)}</span></li>
              ))}</ul>
            </section>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ds-text-secondary">Contagem feita direto no bucket (atualizada a cada 5 minutos). O custo é uma estimativa pela tabela pública da Cloudflare: o download das fotos não gera cobrança de saída. As leituras passam pela rede da Cloudflare e não são medidas aqui (o plano gratuito inclui 10 milhões por mês).</p>
        </>
      )}
    </section>
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
        <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-ds-primary-deep"><Icon name="payments" className="!text-[30px]" />Custos</h1>
        <p className="mt-1 text-sm text-ds-text-secondary">Quanto o projeto gasta com inteligência artificial e com armazenamento de arquivos, em reais e dólares (valores estimados pelas tabelas públicas de preços).</p>
      </header>

      <h2 className="mb-3 flex items-center gap-3 text-xl font-extrabold tracking-tight text-ds-primary-deep"><Icon name="smart_toy" className="!text-[28px] text-ds-primary" />Inteligência artificial (OpenAI)</h2>
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
      <R2Costs rate={r} />

      <p className="mt-6 text-xs leading-relaxed text-ds-text-secondary">O registro da IA começou quando esta tela foi criada; o que foi usado antes aparece como uma estimativa única. Os valores são estimativas com base nos tokens informados pela OpenAI e podem diferir um pouco da fatura.</p>
    </div>
  );
}

export default function AiCostPage() {
  return <PageShell permissionKey="custo_ia">{() => <Cost />}</PageShell>;
}
