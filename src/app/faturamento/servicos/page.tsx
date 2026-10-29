"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { btnPrimary, card } from "@/components/contratos/admin-ui";
import { FAT_KEYS } from "@/lib/faturamento";

const OPTIONS = [
  { key: "avulso", label: "Faturamento de Serviços", cat: "Receita de Contratos de Manutenção", mov: "Sim", href: "/faturamento/produtos?tipo=servicos" },
  { key: "os", label: "Faturamento de Serviços da OS", cat: "Receita de Instalação (Projetos Novos)", mov: "Sim", href: "/faturamento/ordem-servico?tipo=S" },
  { key: "contratos", label: "Faturamento de Contratos", cat: "Receita de Contratos de Manutenção", mov: "Sim", href: "/faturamento/contratos" },
  { key: "locacao", label: "Comodato/Locação de Equipamentos", cat: "Receita de Locação de Equipamentos", mov: "Sim", href: "/faturamento/produtos?tipo=locacao" },
];

function Services() {
  const router = useRouter();
  const [sel, setSel] = useState(OPTIONS[0]);
  return (
    <div className="mx-auto max-w-[1000px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Faturamento de Serviço" }]} />
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-ds-primary-deep">Faturamento de Serviço</h1>
      <div className={`${card} grid gap-8 p-6 md:grid-cols-2 md:p-8`}>
        <div>
          <h2 className="mb-3 text-base font-bold text-ds-primary-deep">Qual tipo de faturamento deseja realizar?</h2>
          <ul className="overflow-hidden rounded-xl border border-ds-border-subtle">{OPTIONS.map((o) => <li key={o.key} className="border-b border-ds-border-subtle last:border-0"><label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm hover:bg-ds-bg"><input type="radio" name="tipo" checked={sel.key === o.key} onChange={() => setSel(o)} className="h-4 w-4 accent-[#F7941D]" />{o.label}</label></li>)}</ul>
          <button type="button" onClick={() => router.push(sel.href)} className={`${btnPrimary} mt-5`}>Continuar →</button>
        </div>
        <dl className="space-y-3 text-sm"><div><dt className="font-bold text-ds-primary-deep">{sel.label}</dt></div><div><dt className="text-xs text-ds-text-secondary">Categoria</dt><dd className="font-semibold">{sel.cat}</dd></div><div><dt className="text-xs text-ds-text-secondary">Gera Movimento Financeiro</dt><dd className="font-semibold">{sel.mov}</dd></div><div><dt className="text-xs text-ds-text-secondary">Observação da nota</dt><dd className="font-semibold">-</dd></div></dl>
      </div>
    </div>
  );
}

export default function ServicesPage() { return <PageShell permissionKey={FAT_KEYS.servicos}>{() => <Services />}</PageShell>; }
