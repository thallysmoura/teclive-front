"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/cadastros";
import { quotesClient, type QuoteStats } from "@/lib/comercial";
import { BarList, ChartCard, Columns, Donut, KpiCard } from "@/components/cadastros/kpi";

const short = (n: number) => (n >= 1000 ? `R$ ${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(".", ",")}k` : `R$ ${Math.round(n)}`);

export function QuoteInsights({ reload }: { reload: number }) {
  const [s, setS] = useState<QuoteStats | null>(null);
  useEffect(() => { quotesClient.stats().then(setS).catch(() => {}); }, [reload]);
  if (!s) return <div className="mb-5 h-24 animate-pulse rounded-xl bg-white/60" aria-hidden="true" />;
  return (
    <div className="mb-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="pending_actions" label="Em aberto" value={money(s.openValue)} hint={`${s.openCount} orçamento(s) aguardando decisão`} tone="warning" />
        <KpiCard icon="verified" label="Vendas ganhas" value={money(s.wonValue)} hint={`${s.wonCount} orçamento(s) ganhos`} tone="success" />
        <KpiCard icon="percent" label="Taxa de conversão" value={`${s.conversionRate.toFixed(1).replace(".", ",")}%`} hint="ganhos ÷ (ganhos + perdidos)" tone="info" />
        <KpiCard icon="sell" label="Ticket médio" value={money(s.averageTicket)} hint="valor médio dos orçamentos ganhos" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ChartCard title="Orçamentos por situação"><Donut data={s.statuses} /></ChartCard>
        <ChartCard title="Vendas ganhas por mês (R$)"><Columns data={s.monthlyWon} format={short} /></ChartCard>
        <ChartCard title="Vendas por vendedor"><BarList data={s.bySeller} format={money} /></ChartCard>
        <ChartCard title="Maiores clientes"><BarList data={s.topClients} format={money} /></ChartCard>
      </div>
    </div>
  );
}
