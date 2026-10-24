"use client";

import { useEffect, useState } from "react";
import { catalogClient, peopleClient, productsClient, servicesClient, money, roleLabels, type CatalogKind, type CatalogStats, type PeopleStats, type Person, type ProductStats, type ServiceItem, type ServiceStats } from "@/lib/cadastros";
import { BarList, ChartCard, Columns, Donut, KpiCard } from "@/components/cadastros/kpi";

const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : "0%");

export function PeopleInsights() {
  const [s, setS] = useState<PeopleStats | null>(null);
  useEffect(() => { peopleClient.stats().then(setS).catch(() => {}); }, []);
  if (!s) return <div className="mb-5 h-24 animate-pulse rounded-xl bg-white/60" aria-hidden="true" />;
  return (
    <div className="mb-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="groups" label="Total de pessoas" value={s.total} hint={`${s.active} ativas · ${s.inactive} inativas`} />
        <KpiCard icon="person_add" label="Novos em 30 dias" value={s.newLast30Days} hint="cadastros recentes" tone="success" />
        <KpiCard icon="badge" label="Com CPF/CNPJ" value={`${s.withDocumentPct}%`} hint="documento preenchido" tone="info" />
        <KpiCard icon="contact_phone" label="Com contato" value={`${s.withContactPct}%`} hint="e-mail ou telefone" tone="warning" />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <ChartCard title="Física x Jurídica"><Donut data={[{ label: "Pessoa Física", value: s.physical }, { label: "Pessoa Jurídica", value: s.legal }]} /></ChartCard>
        <ChartCard title="Por tipo de cadastro"><BarList data={s.roles} /></ChartCard>
        <ChartCard title="Novos cadastros por mês"><Columns data={s.monthly} /></ChartCard>
      </div>
    </div>
  );
}

export function ServiceInsights() {
  const [s, setS] = useState<ServiceStats | null>(null);
  useEffect(() => { servicesClient.stats().then(setS).catch(() => {}); }, []);
  if (!s) return <div className="mb-5 h-24 animate-pulse rounded-xl bg-white/60" aria-hidden="true" />;
  return (
    <div className="mb-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="home_repair_service" label="Serviços ativos" value={s.active} hint={`${s.total} no total · ${s.inactive} inativos`} />
        <KpiCard icon="sell" label="Preço médio" value={money(s.averagePrice)} hint={s.topService ? `Maior: ${money(s.topService.price)}` : undefined} tone="success" />
        <KpiCard icon="trending_up" label="Margem média" value={`${s.averageMargin.toFixed(1).replace(".", ",")}%`} hint={`Lucro médio ${money(s.averageProfit)}`} tone="info" />
        <KpiCard icon="description" label="Para contratos" value={pct(s.contracts, s.active)} hint={`${s.contracts} contratos · ${s.workOrders} O.S.`} tone="warning" />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <ChartCard title="Serviço para"><Donut data={[{ label: "Contratos", value: s.contracts }, { label: "Ordens de Serviço", value: s.workOrders }]} /></ChartCard>
        <ChartCard title="Por categoria da receita"><BarList data={s.categories} /></ChartCard>
        <ChartCard title="Faixas de preço"><Columns data={s.priceRanges} /></ChartCard>
      </div>
    </div>
  );
}

/** Resumo no topo da edição de pessoa. */
export function PersonSummary({ person }: { person: Person }) {
  const checks = [person.document, person.email, person.phone, person.nickname, person.identifier, person.taxpayerType, person.type === "F" ? person.rg : person.stateRegistration];
  const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon={person.type === "J" ? "apartment" : "person"} label="Tipo de pessoa" value={person.type === "J" ? "Jurídica" : "Física"} hint={person.isActive ? "Cadastro ativo" : "Cadastro inativo"} tone={person.isActive ? "success" : "warning"} />
      <KpiCard icon="badge" label="Cadastrado como" value={<span className="text-base">{roleLabels(person)}</span>} />
      <KpiCard icon="verified" label="Completude do cadastro" value={`${completeness}%`} hint={completeness < 100 ? "Preencha os campos vazios" : "Cadastro completo"} tone="info" />
      <KpiCard icon="contact_phone" label="Contato principal" value={<span className="text-base">{person.phone || person.email || "Não informado"}</span>} tone="warning" />
    </div>
  );
}

/** Resumo no topo da edição de serviço. */
export function ServiceSummary({ service }: { service: ServiceItem }) {
  const [s, setS] = useState<ServiceStats | null>(null);
  useEffect(() => { servicesClient.stats().then(setS).catch(() => {}); }, []);
  const cost = Number(service.cost), price = Number(service.price), profit = price - cost;
  const versus = s && s.averagePrice ? ((price / s.averagePrice - 1) * 100) : null;
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon="payments" label="Preço de venda" value={money(price)} hint={service.isActive ? "Serviço ativo" : "Serviço inativo"} tone={service.isActive ? "success" : "warning"} />
      <KpiCard icon="receipt_long" label="Custo" value={money(cost)} />
      <KpiCard icon="trending_up" label="Lucro por serviço" value={money(profit)} hint={`Margem ${Number(service.margin).toFixed(1).replace(".", ",")}%`} tone="info" />
      <KpiCard icon="compare_arrows" label="Versus preço médio" value={versus === null ? "—" : `${versus >= 0 ? "+" : ""}${versus.toFixed(0)}%`} hint={s ? `Média ${money(s.averagePrice)}` : undefined} tone="warning" />
    </div>
  );
}

export function ProductInsights() {
  const [s, setS] = useState<ProductStats | null>(null);
  useEffect(() => { productsClient.stats().then(setS).catch(() => {}); }, []);
  if (!s) return <div className="mb-5 h-24 animate-pulse rounded-xl bg-white/60" aria-hidden="true" />;
  return (
    <div className="mb-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="inventory_2" label="Produtos ativos" value={s.active} hint={`${s.total} no total · ${s.inactive} inativos`} />
        <KpiCard icon="warehouse" label="Valor em estoque" value={money(s.stockValue)} hint={`Lucro potencial ${money(s.potentialProfit)}`} tone="success" />
        <KpiCard icon="sell" label="Preço médio de venda" value={money(s.averagePrice)} hint={`Margem média ${s.averageMargin.toFixed(1).replace(".", ",")}%`} tone="info" />
        <KpiCard icon="production_quantity_limits" label="Sem estoque" value={s.withoutStock} hint={`${s.withStock} com saldo`} tone="warning" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ChartCard title="Estoque dos produtos"><Donut data={[{ label: "Com saldo", value: s.withStock }, { label: "Sem saldo", value: s.withoutStock }]} /></ChartCard>
        <ChartCard title="Produtos por grupo"><BarList data={s.byGroup} /></ChartCard>
        <ChartCard title="Produtos por marca"><BarList data={s.byBrand} /></ChartCard>
        <ChartCard title="Faixas de preço de venda"><Columns data={s.priceRanges} /></ChartCard>
      </div>
    </div>
  );
}

const brl = (n: number) => money(n);

export function CatalogInsights({ kind, noun }: { kind: CatalogKind; noun: string }) {
  const [s, setS] = useState<CatalogStats | null>(null);
  useEffect(() => { catalogClient(kind).stats().then(setS).catch(() => {}); }, [kind]);
  if (!s) return <div className="mb-5 h-24 animate-pulse rounded-xl bg-white/60" aria-hidden="true" />;
  const hasUsage = kind !== "activity-branches";
  return (
    <div className="mb-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="category" label={`${noun} cadastrad${kind === "brands" ? "as" : "os"}`} value={s.total} hint={`${s.active} ativ${kind === "brands" ? "as" : "os"}`} />
        <KpiCard icon="link" label="Em uso" value={s.used} hint={hasUsage ? `por ${s.usageLabel} ativos` : "vinculados a pessoas"} tone="success" />
        <KpiCard icon="link_off" label="Sem uso" value={s.unused} hint={hasUsage ? "podem ser inativados" : "nenhum vínculo ainda"} tone="warning" />
        <KpiCard icon="block" label="Inativos" value={s.inactive} tone="info" />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <ChartCard title="Uso do cadastro"><Donut data={[{ label: "Em uso", value: s.used }, { label: "Sem uso", value: s.unused }, { label: "Inativos", value: s.inactive }]} /></ChartCard>
        {hasUsage ? (
          <>
            <ChartCard title="Mais usados (produtos)"><BarList data={s.top} /></ChartCard>
            <ChartCard title="Valor em estoque (custo)"><BarList data={s.stockByItem} format={brl} /></ChartCard>
          </>
        ) : (
          <ChartCard title="Carteira por ramo de atividade"><p className="py-6 text-center text-sm text-ds-text-secondary">Nenhuma pessoa está vinculada a um ramo de atividade ainda. Vincule os ramos aos clientes para ver quais segmentos concentram a carteira.</p></ChartCard>
        )}
      </div>
    </div>
  );
}
