"use client";

import Link from "next/link";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { RELATORIOS_KEY } from "@/lib/relatorios";

const REPORTS = [
  { href: "/relatorios/pessoas", icon: "groups", title: "Relatório de Cadastro de Pessoas", text: "Todos os cadastros de pessoas com documento, endereço e contatos." },
];

export default function ReportsPage() {
  return (
    <PageShell permissionKey={RELATORIOS_KEY}>
      {() => (
        <div className="mx-auto max-w-[1100px]">
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Administrativo" }, { label: "Relatórios" }]} />
          <h1 className="mb-1 flex items-center gap-3 text-2xl font-extrabold tracking-tight text-ds-primary-deep"><Icon name="print" className="!text-[30px]" />Relatórios</h1>
          <p className="mb-5 text-sm text-ds-text-secondary">Escolha um relatório, defina os filtros e gere o documento.</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REPORTS.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="flex h-full items-start gap-3 rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ds-primary/10 text-ds-primary"><Icon name={r.icon} className="text-[24px]" /></span>
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
