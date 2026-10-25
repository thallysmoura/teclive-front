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
import { MemberHome } from "./member-home";
import { HomeBanner } from "@/components/layout/home-banner";
import { AiSummaryModal } from "@/components/layout/ai-summary-modal";
import { RecentVisits } from "@/components/layout/recent-visits";
import { InstallToast } from "@/components/layout/install-toast";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const LONG_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const BLUES = ["#00355A", "#00558C", "#008DFF", "#4DB0FF", "#99D1FF", "#C9E4FA"];
const compact = (n: number) => (Math.abs(n) >= 1e6 ? `R$ ${(n / 1e6).toFixed(1).replace(".", ",")} mi` : Math.abs(n) >= 1e3 ? `R$ ${(n / 1e3).toFixed(1).replace(".", ",")} mil` : money(n));
const int = (n: number) => n.toLocaleString("pt-BR");


/** Mini-gráfico de área (série mensal) para os destaques. */
function Spark({ values, dark = false }: { values: number[]; dark?: boolean }) {
  if (values.length < 2 || Math.max(...values) <= 0) return null;
  const w = 120, h = 36, max = Math.max(...values), step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 4 - (v / max) * (h - 8)).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-28 shrink-0" role="img" aria-label="Evolução mensal">
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={dark ? "rgba(255,255,255,0.14)" : "rgba(0,141,255,0.12)"} />
      <polyline points={pts.join(" ")} fill="none" stroke={dark ? "#ffffff" : "#008DFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r="3" fill={dark ? "#ffffff" : "#008DFF"} />
    </svg>
  );
}

type Delta = { text: string; good: boolean };
const deltaOf = (series: number[]): Delta | undefined => {
  if (series.length < 2) return undefined;
  const prev = series[series.length - 2], last = series[series.length - 1];
  if (!prev) return undefined;
  const change = Math.round(((last - prev) / prev) * 100);
  return { text: `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs. mês anterior`, good: change >= 0 };
};

function Hero({ href, icon, label, value, detail, foot, series, delta, dark = false, children }: { href: string; icon: string; label: string; value: string; detail?: string; foot?: string; series?: number[]; delta?: Delta; dark?: boolean; children?: React.ReactNode }) {
  return (
    <Link href={href} className={`group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${dark ? "border-transparent bg-gradient-to-br from-ds-primary-deep to-[#00558c] text-white" : "border-ds-border-subtle bg-white hover:border-ds-primary"}`}>
      <span className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2.5"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${dark ? "bg-white/15" : "bg-ds-primary/10 text-ds-primary"}`}><Icon name={icon} className="text-[22px]" /></span><span className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-white/75" : "text-ds-text-secondary"}`}>{label}</span></span>
        <Icon name="arrow_outward" className={`text-[18px] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${dark ? "text-white/60" : "text-ds-border"}`} />
      </span>
      <span className="mt-5 flex items-end justify-between gap-3">
        <span className="min-w-0"><span className={`block whitespace-nowrap text-[34px] font-extrabold leading-none tracking-tight ${dark ? "text-white" : "text-ds-primary-deep"}`}>{value}</span>{detail && <span className={`mt-2 block text-[13px] font-medium ${dark ? "text-white/85" : "text-ds-text-muted"}`}>{detail}</span>}</span>
        {series && <Spark values={series} dark={dark} />}
      </span>
      {children}
      <span className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {delta && <span title="Mês atual (parcial) comparado ao mês anterior" className={`rounded-full px-2 py-0.5 font-bold ${dark ? "bg-white/15 text-white" : delta.good ? "bg-ds-primary/10 text-ds-primary" : "bg-ds-danger-bg text-ds-danger-text"}`}>{delta.text}</span>}
        {foot && <span className={dark ? "text-white/70" : "text-ds-text-secondary"}>{foot}</span>}
      </span>
    </Link>
  );
}

function Stat({ href, label, value, hint, bad = false }: { href: string; label: string; value: string; hint: string; bad?: boolean }) {
  return (
    <Link href={href} className="min-w-0 rounded-2xl border border-ds-border-subtle bg-white px-4 py-3 transition-colors hover:border-ds-primary">
      <span className="block truncate text-[11px] font-bold uppercase tracking-wider text-ds-text-secondary">{label}</span>
      <span className={`mt-1 block whitespace-nowrap text-xl font-extrabold tracking-tight ${bad ? "text-ds-danger-text" : "text-ds-primary-deep"}`}>{value}</span>
      <span className="block truncate text-xs text-ds-text-secondary">{hint}</span>
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
  const [aiOpen, setAiOpen] = useState(false);
  const load = useCallback(() => getOverview().then((d) => { setData(d); setError(""); }).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")), []);
  useEffect(() => { void load(); const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 120000); return () => clearInterval(t); }, [load]);

  const now = new Date();
  const first = user.name.trim().split(/\s+/)[0];
  const c = data?.comercial, o = data?.operacional, e = data?.estoque, k = data?.cadastros, g = data?.governanca;

  // Pontos de atenção do dia (cada um leva direto para a tela de ação).
  const alerts: { icon: string; tone: string; text: string; href: string }[] = [];
  if (o?.late) alerts.push({ icon: "alarm", tone: "bg-ds-danger-bg text-ds-danger-text border-ds-danger-border", text: `${o.late} obras atrasadas`, href: "/gestao-obras?grupo=atraso" });
  if (o?.pendingQuotes) alerts.push({ icon: "request_quote", tone: "bg-white text-ds-primary-deep border-ds-border-subtle", text: `${o.pendingQuotes} vendas sem ordem de serviço aberta (${compact(o.pendingQuotesValue)})`, href: "/operacional/andamento" });
  if (c?.expiring) alerts.push({ icon: "hourglass_bottom", tone: "bg-white text-ds-primary-deep border-ds-border-subtle", text: `${c.expiring} orçamentos vencem em 7 dias`, href: "/comercial/orcamentos?status=3" });
  if (o?.ready) alerts.push({ icon: "task_alt", tone: "bg-white text-ds-primary-deep border-ds-border-subtle", text: `${o.ready} obras prontas para fechar e faturar`, href: "/gestao-obras?grupo=fechamento" });
  if (e?.negative) alerts.push({ icon: "inventory", tone: "bg-white text-ds-primary-deep border-ds-border-subtle", text: `${e.negative} produtos com saldo negativo no estoque`, href: "/estoque/saldo" });
  if (g?.pending) alerts.push({ icon: "person_alert", tone: "bg-white text-ds-primary-deep border-ds-border-subtle", text: `${g.pending} usuários aguardando permissão`, href: "/access-control" });

  return (
    <div className="mx-auto max-w-[1400px]">
      <HomeBanner user={user} updatedAt={data?.generatedAt} onRefresh={load} onAi={() => setAiOpen(true)} subtitle="Painel executivo — visão consolidada de toda a operação da Teclive." />

      {aiOpen && <AiSummaryModal user={user} onClose={() => setAiOpen(false)} />}
      <RecentVisits userId={user.id} className="mb-5" />

      {error && <p role="alert" className="mb-4 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      {!data ? <p className="py-16 text-center text-sm text-ds-text-secondary">Carregando painel...</p> : (
        <div className="space-y-6">
          {alerts.length > 0 && (
            <section aria-label="Pontos de atenção"><h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ds-text-secondary">Atenção hoje</h2>
              <ul className="flex flex-wrap gap-2">{alerts.map((a) => <li key={a.text}><Link href={a.href} className={`inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:border-ds-primary ${a.tone}`}><Icon name={a.icon} className={`shrink-0 text-[18px] ${a.tone.includes("danger") ? "" : "text-ds-primary"}`} />{a.text}<Icon name="arrow_forward" className="text-[16px] opacity-60" /></Link></li>)}</ul></section>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {c && <Hero dark href="/comercial/orcamentos?status=4,7,8" icon="trending_up" label="Vendas fechadas" value={compact(c.wonValue)} detail={`${c.wonCount} orçamentos aprovados pelos clientes`} series={c.monthlyWon.map((m) => m.value)} delta={deltaOf(c.monthlyWon.map((m) => m.value))} foot={`Ticket médio ${compact(c.averageTicket)} · ${money(c.wonValue)}`} />}
            {c && (
              <Hero href="/comercial/orcamentos?status=3" icon="filter_alt" label="Propostas em negociação" value={compact(c.openValue)} detail={`${c.openCount} propostas aguardando resposta do cliente`} foot={`${String(c.conversionRate).replace(".", ",")}% das propostas viram venda`}>
                <span className="mt-4 block"><span className="mb-1 flex justify-between text-[11px] font-semibold text-ds-text-secondary"><span>Propostas que viram venda</span><span className="text-ds-primary-deep">{String(c.conversionRate).replace(".", ",")}%</span></span><span className="block h-2 overflow-hidden rounded-full bg-ds-bg"><span className="block h-full rounded-full bg-ds-primary" style={{ width: `${Math.min(100, c.conversionRate)}%` }} /></span></span>
              </Hero>
            )}
            {o && (
              <Hero href="/gestao-obras?grupo=execucao" icon="engineering" label="Obras em andamento" value={compact(o.openValue)} detail={`${o.active} obras em andamento`} foot={o.late ? `${o.late} em atraso (${o.active ? Math.round((o.late / o.active) * 100) : 0}%)` : "Todas dentro do prazo"}>
                <span className="mt-4 block"><span className="mb-1 flex justify-between text-[11px] font-semibold text-ds-text-secondary"><span>Obras atrasadas</span><span className={o.late ? "text-ds-danger-text" : "text-ds-primary-deep"}>{o.late} / {o.active}</span></span><span className="flex h-2 overflow-hidden rounded-full bg-ds-bg"><span className="h-full bg-ds-primary" style={{ width: `${o.active ? ((o.active - o.late) / o.active) * 100 : 100}%` }} /><span className="h-full bg-ds-danger" style={{ width: `${o.active ? (o.late / o.active) * 100 : 0}%` }} /></span></span>
              </Hero>
            )}
            {o && <Hero href="/gestao-obras?grupo=faturadas" icon="payments" label="Serviços já cobrados" value={compact(o.billedValue)} detail={`${o.billedCount} ordens de serviço faturadas`} series={o.monthly.map((m) => m.value)} delta={deltaOf(o.monthly.map((m) => m.value))} foot={`${o.pendingQuotes} vendas ainda sem ordem de serviço`} />}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {c && <Stat href="/comercial/orcamentos?status=4,7,8" label="Propostas que viram venda" value={`${String(c.conversionRate).replace(".", ",")}%`} hint={`${c.wonCount} fechadas de ${c.wonCount + (c.total - c.wonCount - c.openCount)} respondidas`} bad={c.conversionRate < 30} />}
            {o && <Stat href="/gestao-obras?grupo=atraso" label="Obras atrasadas" value={String(o.late)} hint={`de ${compact(o.openValue)} em andamento`} bad={o.late > 0 && o.active > 0 && o.late / o.active >= 0.15} />}
            {o && <Stat href="/gestao-obras?grupo=materiais" label="Materiais entregues" value={`${o.materialsPercent}%`} hint={`${int(o.pendingUnits)} unidades pendentes`} bad={o.materialsPercent < 50} />}
            {e && <Stat href="/estoque/saldo" label="Valor em estoque" value={compact(e.costValue)} hint={`${int(e.units)} unidades · ${e.zero} sem saldo`} />}
          </div>

          {c && data.access.comercial && (
            <Section icon="work" title="Comercial" subtitle="Funil de vendas, receita e desempenho do time" href="/comercial/orcamentos" linkLabel="Ver orçamentos">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <ChartCard title="Orçamentos por situação"><Donut data={c.statuses} center={String(c.total)} palette={BLUES} /></ChartCard>
                <ChartCard title="Vendas fechadas por mês"><div className="pt-6"><Columns data={c.monthlyWon} format={compact} /></div></ChartCard>
                <ChartCard title="Vendas por vendedor"><BarList data={c.bySeller} format={compact} /></ChartCard>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Mini label="Prospects ativos" value={int(c.leads)} href="/comercial/prospects" /><Mini label="Ações de venda" value={int(c.actions)} href="/comercial/acoes-venda" />
                <Mini label="Vencem em 7 dias" value={int(c.expiring)} href="/comercial/orcamentos?status=3" /><Mini label="Maior cliente" value={c.topClients[0] ? `${c.topClients[0].label.slice(0, 22)} · ${compact(c.topClients[0].value)}` : "—"} />
              </div>
            </Section>
          )}

          {o && (
            <Section icon="build" title="Operacional" subtitle="Ordens de serviço, prazos, equipe e faturamento" href="/gestao-obras" linkLabel="Abrir Gestão de Obras">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <ChartCard title="OS por situação"><Donut data={o.byStatus} center={String(o.total)} palette={BLUES} /></ChartCard>
                <ChartCard title="Valor das obras abertas por mês"><div className="pt-6"><Columns data={o.monthly.map((m) => ({ label: `${MONTHS[Number(m.month.slice(5)) - 1]}/${m.month.slice(2, 4)}`, value: m.value }))} format={compact} /></div></ChartCard>
                <ChartCard title="Obras abertas por técnico"><BarList data={o.byTechnician.slice(0, 6)} /></ChartCard>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Mini label="Materiais entregues" value={`${o.materialsPercent}%`} href="/gestao-obras?grupo=materiais" /><Mini label="Entregas no prazo" value={o.onTimePercent === null ? "—" : `${o.onTimePercent}%`} href="/gestao-obras" />
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
  return <PageShell permissionKey="inicio">{(user) => <>{user.role === "ADMIN" ? <Home user={user} /> : <MemberHome user={user} />}<InstallToast /></>}</PageShell>;
}
