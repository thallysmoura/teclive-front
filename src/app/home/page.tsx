"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { BarList, ChartCard, Columns, Donut } from "@/components/cadastros/kpi";
import { Icon } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Me } from "@/lib/api";
import { money } from "@/lib/cadastros";
import { getOverview, type Overview } from "@/lib/dashboard";
import { fmtDate, formatOsNumber } from "@/lib/operacional";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const compact = (n: number) => (Math.abs(n) >= 1e6 ? `R$ ${(n / 1e6).toFixed(1).replace(".", ",")} mi` : Math.abs(n) >= 1e3 ? `R$ ${(n / 1e3).toFixed(1).replace(".", ",")} mil` : money(n));
const int = (n: number) => n.toLocaleString("pt-BR");

function Kpi({ href, icon, label, value, hint, tone, trend }: { href: string; icon: string; label: string; value: string; hint?: string; tone: string; trend?: { text: string; good: boolean } }) {
  return (
    <Link href={href} className="group min-w-0 rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-ds-primary hover:shadow-md">
      <span className="flex items-center justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}><Icon name={icon} className="text-[20px]" /></span><Icon name="arrow_outward" className="text-[16px] text-ds-border transition-colors group-hover:text-ds-primary" /></span>
      <span className="mt-3 block text-[11px] font-bold uppercase tracking-wider text-ds-text-secondary">{label}</span>
      <span className="mt-1 block text-[26px] font-extrabold leading-none tracking-tight" style={{ color: tone }}>{value}</span>
      <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ds-text-secondary">{hint}{trend && <span className={`rounded-full px-1.5 py-0.5 font-semibold ${trend.good ? "bg-ds-success/10 text-ds-success" : "bg-ds-danger-bg text-ds-danger-text"}`}>{trend.text}</span>}</span>
    </Link>
  );
}

function Section({ icon, title, subtitle, href, linkLabel, children }: { icon: string; title: string; subtitle: string; href: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border border-ds-border-subtle bg-white/60 p-3 sm:p-5">
      <header className="mb-4 flex flex-wrap items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ds-primary-deep text-white"><Icon name={icon} className="text-[22px]" /></span>
        <div className="min-w-0 flex-1"><h2 className="text-base font-extrabold text-ds-primary-deep">{title}</h2><p className="text-xs text-ds-text-secondary">{subtitle}</p></div>
        <Link href={href} className="inline-flex h-9 items-center gap-1 rounded-lg border border-ds-primary-deep px-3 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white">{linkLabel}<Icon name="arrow_forward" className="text-[16px]" /></Link></header>
      {children}
    </section>
  );
}

function Mini({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = <><span className="block text-[11px] font-semibold uppercase tracking-wide text-ds-text-secondary">{label}</span><span className="mt-1 block text-lg font-bold text-ds-primary-deep">{value}</span></>;
  return href ? <Link href={href} className="rounded-xl border border-ds-border-subtle bg-white p-3 hover:border-ds-primary">{body}</Link> : <div className="rounded-xl border border-ds-border-subtle bg-white p-3">{body}</div>;
}

function Home({ user }: { user: Me }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => getOverview().then((d) => { setData(d); setError(""); }).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")), []);
  useEffect(() => { void load(); const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 120000); return () => clearInterval(t); }, [load]);

  const first = user.name.trim().split(/\s+/)[0];
  const c = data?.comercial, o = data?.operacional, e = data?.estoque, k = data?.cadastros, g = data?.governanca;

  // Pontos de atenção do dia (cada um leva direto para a tela de ação).
  const alerts: { icon: string; tone: string; text: string; href: string }[] = [];
  if (o?.late) alerts.push({ icon: "alarm", tone: "bg-ds-danger-bg text-ds-danger-text border-ds-danger-border", text: `${o.late} obras em atraso`, href: "/gestao-obras?grupo=atraso" });
  if (o?.pendingQuotes) alerts.push({ icon: "request_quote", tone: "bg-[#FFF8EC] text-ds-warning-text border-[#F7D9A8]", text: `${o.pendingQuotes} orçamentos ganhos sem OS (${compact(o.pendingQuotesValue)})`, href: "/operacional/andamento" });
  if (c?.expiring) alerts.push({ icon: "hourglass_bottom", tone: "bg-[#FFF8EC] text-ds-warning-text border-[#F7D9A8]", text: `${c.expiring} orçamentos vencem em 7 dias`, href: "/comercial/orcamentos?status=3" });
  if (o?.ready) alerts.push({ icon: "task_alt", tone: "bg-[#EEFBF5] text-[#0e6b4a] border-[#BDE8D6]", text: `${o.ready} obras prontas para fechar e faturar`, href: "/gestao-obras?grupo=fechamento" });
  if (e?.negative) alerts.push({ icon: "inventory", tone: "bg-ds-danger-bg text-ds-danger-text border-ds-danger-border", text: `${e.negative} produtos com saldo negativo no estoque`, href: "/estoque/saldo" });
  if (g?.pending) alerts.push({ icon: "person_alert", tone: "bg-ds-bg text-ds-text-muted border-ds-border-subtle", text: `${g.pending} usuários aguardando permissão`, href: "/access-control" });

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="relative mb-5 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-ds-primary-deep via-[#00558c] to-ds-primary p-4 pr-16 text-white shadow-sm sm:mb-6 sm:gap-4 sm:p-6 sm:pr-6">
        <span className="shrink-0 rounded-full bg-white/15 p-1 sm:p-1.5"><span className="hidden sm:block"><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={72} presence="online" /></span><span className="sm:hidden"><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={52} presence="online" /></span></span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-3xl">Olá, {first}!</h1>
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-2 text-xs text-white/80 sm:static">{data && <span className="hidden md:inline">Atualizado às {new Date(data.generatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
          <button type="button" onClick={() => void load()} aria-label="Atualizar painel" title="Atualizar" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25"><Icon name="refresh" className="text-[20px]" /></button></div>
      </header>

      {error && <p role="alert" className="mb-4 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      {!data ? <p className="py-16 text-center text-sm text-ds-text-secondary">Carregando painel...</p> : (
        <div className="space-y-6">
          {alerts.length > 0 && (
            <section aria-label="Pontos de atenção"><h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ds-text-secondary">Atenção hoje</h2>
              <ul className="flex flex-wrap gap-2">{alerts.map((a) => <li key={a.text}><Link href={a.href} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium hover:brightness-95 ${a.tone}`}><Icon name={a.icon} className="text-[18px]" />{a.text}<Icon name="arrow_forward" className="text-[16px] opacity-60" /></Link></li>)}</ul></section>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            {c && <Kpi href="/comercial/orcamentos?status=4,7,8" icon="trending_up" label="Receita ganha" value={compact(c.wonValue)} hint={`${c.wonCount} orçamentos`} tone="#00A972" />}
            {c && <Kpi href="/comercial/orcamentos?status=3" icon="filter_alt" label="Pipeline aberto" value={compact(c.openValue)} hint={`${c.openCount} propostas`} tone="#008DFF" />}
            {c && <Kpi href="/comercial/orcamentos" icon="percent" label="Conversão" value={`${String(c.conversionRate).replace(".", ",")}%`} hint={`${c.wonCount} ganhos de ${c.wonCount + (c.total - c.wonCount - c.openCount)} decididos`} tone="#7A5AF8" trend={{ text: c.conversionRate >= 30 ? "saudável" : "atenção", good: c.conversionRate >= 30 }} />}
            {c && <Kpi href="/comercial/orcamentos" icon="receipt_long" label="Ticket médio" value={compact(c.averageTicket)} hint={c.recurringTotal ? `+ ${compact(c.recurringTotal)} recorrente` : "por orçamento ganho"} tone="#0DB38A" />}
            {o && <Kpi href="/gestao-obras?grupo=execucao" icon="engineering" label="Obras ativas" value={String(o.active)} hint={compact(o.openValue)} tone="#00355A" />}
            {o && <Kpi href="/gestao-obras?grupo=atraso" icon="alarm" label="Em atraso" value={String(o.late)} hint={o.active ? `${Math.round((o.late / o.active) * 100)}% das ativas` : undefined} tone="#E14337" trend={o.active ? { text: o.late / o.active < 0.15 ? "controlado" : "crítico", good: o.late / o.active < 0.15 } : undefined} />}
            {o && <Kpi href="/gestao-obras?grupo=faturadas" icon="payments" label="OS faturadas" value={compact(o.billedValue)} hint={`${o.billedCount} OS`} tone="#F7941D" />}
            {e && <Kpi href="/estoque/saldo" icon="inventory_2" label="Estoque (custo)" value={compact(e.costValue)} hint={`${int(e.units)} unidades`} tone="#00558C" />}
          </div>

          {c && data.access.comercial && (
            <Section icon="work" title="Comercial" subtitle="Funil de vendas, receita e desempenho do time" href="/comercial/orcamentos" linkLabel="Ver orçamentos">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard title="Orçamentos por situação"><Donut data={c.statuses} center={String(c.total)} /></ChartCard>
                <ChartCard title="Receita ganha por mês"><Columns data={c.monthlyWon} format={compact} /></ChartCard>
                <ChartCard title="Receita por vendedor"><BarList data={c.bySeller} format={compact} /></ChartCard>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Mini label="Prospects ativos" value={int(c.leads)} href="/comercial/prospects" /><Mini label="Ações de venda" value={int(c.actions)} href="/comercial/acoes-venda" />
                <Mini label="Vencem em 7 dias" value={int(c.expiring)} href="/comercial/orcamentos?status=3" /><Mini label="Maior cliente" value={c.topClients[0] ? `${c.topClients[0].label.slice(0, 22)} · ${compact(c.topClients[0].value)}` : "—"} />
              </div>
            </Section>
          )}

          {o && (
            <Section icon="build" title="Operacional" subtitle="Ordens de serviço, prazos, equipe e faturamento" href="/gestao-obras" linkLabel="Abrir Gestão de Obras">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard title="OS por situação"><Donut data={o.byStatus} center={String(o.total)} /></ChartCard>
                <ChartCard title="Valor aberto por mês"><Columns data={o.monthly.map((m) => ({ label: `${MONTHS[Number(m.month.slice(5)) - 1]}/${m.month.slice(2, 4)}`, value: m.value }))} format={compact} /></ChartCard>
                <ChartCard title="Obras abertas por técnico"><BarList data={o.byTechnician.slice(0, 6)} /></ChartCard>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Mini label="Entrega de materiais" value={`${o.materialsPercent}%`} href="/gestao-obras?grupo=materiais" /><Mini label="Prazo cumprido" value={o.onTimePercent === null ? "—" : `${o.onTimePercent}%`} href="/gestao-obras" />
                <Mini label="Tempo médio de execução" value={`${String(o.averageCloseDays).replace(".", ",")} dias`} /><Mini label="Prontas para fechar" value={String(o.ready)} href="/gestao-obras?grupo=fechamento" />
              </div>
              {o.lateList.length > 0 && (
                <div className="mt-4 rounded-2xl border border-ds-border-subtle bg-white p-4"><h3 className="mb-2 text-sm font-semibold text-ds-primary-deep">Obras mais atrasadas</h3>
                  <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm md:grid-cols-2">{o.lateList.slice(0, 6).map((w) => <li key={w.id} className="min-w-0"><Link href={`/operacional/ordens-servico?os=${w.id}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-ds-bg"><span className="min-w-0 truncate"><span className="mr-2 font-semibold text-ds-primary">{formatOsNumber(w.number)}</span>{w.personName}</span><span className="shrink-0 text-xs font-semibold text-ds-danger-text">venceu {fmtDate(w.scheduleEnd)}</span></Link></li>)}</ul></div>
              )}
            </Section>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {e && (
              <Section icon="inventory_2" title="Estoque" subtitle="Saldo, valor imobilizado e movimentação" href="/estoque/saldo" linkLabel="Consultar saldo">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Mini label="Valor a custo" value={compact(e.costValue)} /><Mini label="Valor de venda" value={compact(e.saleValue)} /><Mini label="Movimentos (30 dias)" value={int(e.movements30)} href="/estoque/movimentos" /></div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3"><Mini label="Produtos ativos" value={int(e.products)} /><Mini label="Sem saldo" value={int(e.zero)} href="/estoque/saldo" /><Mini label="Locais" value={int(e.locations)} href="/estoque/locais" /></div>
                {e.topProducts.length > 0 && <div className="mt-4"><ChartCard title="Maior valor em estoque"><BarList data={e.topProducts} format={compact} /></ChartCard></div>}
              </Section>
            )}
            {(k || g) && (
              <Section icon="groups" title="Base cadastral e equipe" subtitle="Clientes, fornecedores, catálogo e acessos" href={k ? "/cadastros/pessoas" : "/access-control"} linkLabel={k ? "Ver cadastros" : "Ver equipe"}>
                {k && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Mini label="Clientes" value={int(k.clients)} href="/cadastros/pessoas" /><Mini label="Fornecedores" value={int(k.suppliers)} href="/cadastros/pessoas" /><Mini label="Técnicos" value={int(k.technicians)} href="/cadastros/pessoas" /><Mini label="Vendedores" value={int(k.sellers)} href="/cadastros/pessoas" /><Mini label="Serviços" value={int(k.services)} href="/cadastros/servicos" /><Mini label="Produtos" value={int(k.products)} href="/cadastros/produtos" /></div>}
                {g && <div className={`${k ? "mt-4 " : ""}grid grid-cols-1 gap-3 sm:grid-cols-4`}><Mini label="Usuários" value={int(g.users)} href="/access-control" /><Mini label="Ativos (7 dias)" value={int(g.active7)} href="/access-control" /><Mini label="Aguardando permissão" value={int(g.pending)} href="/access-control" /><Mini label="Acessos (7 dias)" value={int(g.logs7)} href="/access-logs" /></div>}
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return <PageShell permissionKey="inicio">{(user) => <Home user={user} />}</PageShell>;
}
