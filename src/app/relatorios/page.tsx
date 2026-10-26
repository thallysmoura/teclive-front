"use client";

import Link from "next/link";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { RELATORIOS_KEY } from "@/lib/relatorios";

const REPORTS = [
  { href: "/relatorios/pessoas", icon: "groups", title: "Cadastro de Pessoas", text: "Todos os cadastros de pessoas com documento, endereço e contatos. Escolha os filtros antes de gerar.", tone: "#005CD2" },
  { href: "/relatorios/estrategico?kind=geral", icon: "monitoring", title: "Dados Estratégicos — Visão Geral", text: "Comercial, operacional, estoque e cadastros reunidos em um só documento para a diretoria.", tone: "#00355A" },
  { href: "/relatorios/estrategico?kind=comercial", icon: "work", title: "Comercial — orçamentos e vendas", text: "Situação dos orçamentos, vendas por mês e por vendedor, principais clientes e vencimentos.", tone: "#12A262" },
  { href: "/relatorios/estrategico?kind=operacional", icon: "build", title: "Operacional — ordens e obras", text: "Ordens por situação, tipo e técnico, atrasos, materiais, faturamento e vendas sem ordem.", tone: "#F7941D" },
  { href: "/relatorios/estrategico?kind=estoque", icon: "inventory_2", title: "Estoque — posição e movimentação", text: "Valor em estoque, produtos sem saldo ou negativos e os de maior valor.", tone: "#7A5AF8" },
  { href: "/relatorios/estrategico?kind=cadastros", icon: "apartment", title: "Cadastros e equipe", text: "Clientes, fornecedores, técnicos, vendedores, catálogo e uso do sistema pela equipe.", tone: "#0DB38A" },
];

export default function ReportsPage() {
  return (
    <PageShell permissionKey={RELATORIOS_KEY}>
      {() => (
        <div className="mx-auto max-w-[1100px]">
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Relatórios" }]} />
          <h1 className="mb-1 flex items-center gap-3 text-2xl font-extrabold tracking-tight text-ds-primary-deep"><Icon name="print" className="!text-[30px]" />Relatórios</h1>
          <p className="mb-5 text-sm text-ds-text-secondary">Sugestões de relatórios: escolha um, e o documento é gerado no mesmo formato, pronto para imprimir ou salvar.</p>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ds-text-secondary">Sugestões</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REPORTS.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="flex h-full items-start gap-3 rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm transition-colors hover:border-ds-primary">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: r.tone }}><Icon name={r.icon} className="text-[24px]" /></span>
                  <span><span className="block text-sm font-extrabold text-ds-primary-deep">{r.title}</span><span className="mt-0.5 block text-xs leading-snug text-ds-text-secondary">{r.text}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageShell>
  );
}
