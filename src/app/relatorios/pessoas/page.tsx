"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { RELATORIOS_KEY } from "@/lib/relatorios";

const TAXPAYER = [["", "Todos"], ["1", "Contribuinte"], ["9", "Não Contribuinte"], ["2", "Isento"]];
const REGISTER = [["", "Todos"], ["client", "Cliente"], ["supplier", "Fornecedor"], ["employee", "Funcionário"], ["seller", "Vendedor"], ["carrier", "Transportador"], ["technician", "Técnico"]];
const PERSON = [["T", "Todos"], ["F", "Física"], ["J", "Jurídica"]] as const;

function PeopleReportForm() {
  const router = useRouter();
  const [personType, setPersonType] = useState<"T" | "F" | "J">("T");
  const [taxpayer, setTaxpayer] = useState("");
  const [registerType, setRegisterType] = useState("");
  const [inactive, setInactive] = useState(false);
  const select = "h-10 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";
  const label = "mb-1 block text-xs font-bold text-ds-text-secondary";

  function generate() {
    const q = new URLSearchParams({ personType, taxpayer, registerType, inactive: String(inactive) });
    router.push(`/relatorios/pessoas/visualizar?${q}`);
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Administrativo" }, { label: "Relatórios", href: "/relatorios" }, { label: "Cadastro de Pessoas" }]} />
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-ds-primary-deep">Relatório de Cadastro de Pessoas</h1>
      <div className="grid gap-8 rounded-2xl border border-ds-border-subtle bg-white p-5 shadow-sm md:grid-cols-[minmax(0,420px)_1fr] md:p-7">
        <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="space-y-4">
          <div>
            <span className={label}>Tipo de Pessoa</span>
            <div role="group" aria-label="Tipo de Pessoa" className="inline-flex overflow-hidden rounded-[10px] border border-ds-border">
              {PERSON.map(([v, l]) => <button key={v} type="button" aria-pressed={personType === v} onClick={() => setPersonType(v)} className={`h-10 px-5 text-sm font-bold transition-colors ${personType === v ? "bg-ds-primary-deep text-white" : "bg-white text-ds-text-muted hover:bg-ds-bg"}`}>{l}</button>)}
            </div>
          </div>
          <label className="block"><span className={label}>Tipo de Contribuinte</span><select className={select} value={taxpayer} onChange={(e) => setTaxpayer(e.target.value)}>{TAXPAYER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="block"><span className={label}>Tipo de Cadastro</span><select className={select} value={registerType} onChange={(e) => setRegisterType(e.target.value)}>{REGISTER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <div>
            <span className={label}>Exibir pessoas com status inativo?</span>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ds-text-muted"><input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} className="h-5 w-5 rounded border-ds-border accent-[#005CD2]" />Sim, exibir pessoas inativas.</label>
          </div>
          <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#F7941D] px-6 text-sm font-bold text-white transition-colors hover:bg-[#E5850F]"><Icon name="print" className="text-[20px]" />Gerar Relatório</button>
        </form>
        <div className="flex flex-col items-center justify-center gap-3 text-center text-sm text-ds-text-secondary">
          <Icon name="description" className="!text-[84px] text-ds-border" />
          <p className="max-w-[260px]">Relatório apresenta todos os cadastros de pessoas realizados.</p>
        </div>
      </div>
    </div>
  );
}

export default function PeopleReportPage() {
  return <PageShell permissionKey={RELATORIOS_KEY}>{() => <PeopleReportForm />}</PageShell>;
}
