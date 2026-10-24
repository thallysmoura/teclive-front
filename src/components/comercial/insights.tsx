"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/cadastros";
import { leadsClient, salesActionsClient, type LeadStats, type SalesActionStats } from "@/lib/comercial";
import { BarList, ChartCard, Columns, Donut, KpiCard } from "@/components/cadastros/kpi";

const skeleton = <div className="mb-5 h-24 animate-pulse rounded-xl bg-white/60" aria-hidden="true" />;

export function LeadInsights() {
  const [s, setS] = useState<LeadStats | null>(null);
  useEffect(() => { leadsClient.stats().then(setS).catch(() => {}); }, []);
  if (!s) return skeleton;
  return (
    <div className="mb-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="person_search" label="Leads cadastrados" value={s.total} hint={`${s.active} ativos`} />
        <KpiCard icon="request_quote" label="Com orçamento" value={s.withQuotes} hint={`${s.withoutQuotes} ainda sem orçamento`} tone="success" />
        <KpiCard icon="payments" label="Valor em orçamentos" value={money(s.pipelineValue)} hint="somando todos os orçamentos dos leads" tone="info" />
        <KpiCard icon="how_to_reg" label="Sem vendedor" value={s.withoutSeller} hint={s.withoutSeller ? "atribua um responsável" : "todos com responsável"} tone="warning" />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <ChartCard title="Leads com e sem orçamento"><Donut data={[{ label: "Com orçamento", value: s.withQuotes }, { label: "Sem orçamento", value: s.withoutQuotes }]} /></ChartCard>
        <ChartCard title="Física x Jurídica"><Donut data={[{ label: "Pessoa Física", value: s.physical }, { label: "Pessoa Jurídica", value: s.legal }]} /></ChartCard>
        <ChartCard title="Leads por vendedor"><BarList data={s.bySeller} /></ChartCard>
      </div>
    </div>
  );
}

export function SalesActionInsights() {
  const [s, setS] = useState<SalesActionStats | null>(null);
  useEffect(() => { salesActionsClient.stats().then(setS).catch(() => {}); }, []);
  if (!s) return skeleton;
  return (
    <div className="mb-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="handshake" label="Ações registradas" value={s.total} />
        <KpiCard icon="calendar_month" label="Neste mês" value={s.thisMonth} tone="success" />
        <KpiCard icon="schedule" label="Horas dedicadas" value={`${s.hours.toFixed(1).replace(".", ",")} h`} tone="info" />
        <KpiCard icon="groups" label="Clientes / leads atendidos" value={s.people} tone="warning" />
      </div>
      {s.total > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          <ChartCard title="Ações por canal"><BarList data={s.byChannel} /></ChartCard>
          <ChartCard title="Ações por mês"><Columns data={s.monthly} /></ChartCard>
        </div>
      )}
    </div>
  );
}
