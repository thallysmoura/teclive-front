"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { CONTRACT_STATUS, CONTRATOS_KEY, contractsApi, fmtDoc, type ContractList } from "@/lib/contratos";
import { money } from "@/lib/cadastros";

const STATUS_OPTIONS = [0, 1, 2];

function Contracts() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<number[]>(STATUS_OPTIONS);
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState<{ key: string; desc: boolean }>({ key: "number", desc: true });
  const [data, setData] = useState<ContractList | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => contractsApi.list({ q: term, status, page, orderBy: order.key, desc: order.desc }).then((d) => { setData(d); setError(""); }).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")), [term, status, page, order]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!filterRef.current?.contains(e.target as Node)) setFilter(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const sort = (key: string) => { setOrder((o) => ({ key, desc: o.key === key ? !o.desc : false })); setPage(1); };
  const th = (key: string, label: string, cls = "") => <th className={`px-3 py-3 ${cls}`}><button type="button" onClick={() => sort(key)} className="inline-flex items-center gap-1 font-bold">{label}<Icon name={order.key === key ? (order.desc ? "arrow_downward" : "arrow_upward") : "unfold_more"} className="text-[14px] opacity-60" /></button></th>;

  function exportCsv() {
    const rows = (data?.lista ?? []).map((c) => [c.number, c.personName, fmtDoc(c.personDocument, c.personType), c.activeInvoices, `${c.billingDay}`, c.totalNet.toFixed(2).replace(".", ","), CONTRACT_STATUS[c.status]?.label ?? c.status].join(";"));
    const csv = `﻿Contrato;Cliente;CPF/CNPJ;Faturas vigentes;Dia de vencimento;Valor;Situação\n${rows.join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "contratos.csv"; a.click(); URL.revokeObjectURL(url);
  }

  const total = data?.totalRegistros ?? 0;
  const size = data?.tamanhoPagina ?? 20;
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total ? (page - 1) * size + 1 : 0;
  const to = Math.min(total, page * size);

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Contratos" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Contratos</h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportCsv} aria-label="Exportar" title="Exportar" className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-ds-border bg-white text-ds-primary hover:border-ds-primary"><Icon name="download" className="text-[20px]" /></button>
          <Link href="/contratos/cadastro" className="inline-flex h-10 items-center rounded-[10px] bg-[#F7941D] px-5 text-sm font-bold text-white hover:bg-[#E5850F]">Novo Contrato</Link>
        </div>
      </header>

      <div className="mb-4 rounded-2xl border border-ds-border-subtle bg-white p-3 shadow-sm">
        <form onSubmit={(e) => { e.preventDefault(); setTerm(q); setPage(1); }} className="flex gap-2">
          <div className="relative min-w-0 flex-1"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ds-text-secondary" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número, cliente ou CPF/CNPJ" className="h-10 w-full rounded-[10px] border border-ds-border bg-white pl-10 pr-3 text-sm outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" /></div>
          <button type="submit" className="h-10 rounded-[10px] bg-ds-primary-deep px-4 text-sm font-bold text-white">Buscar</button>
          <div ref={filterRef} className="relative">
            <button type="button" onClick={() => setFilter((v) => !v)} aria-label="Filtros" className="flex h-10 items-center gap-1 rounded-[10px] border border-ds-border px-3 text-ds-primary hover:border-ds-primary"><Icon name="filter_alt" className="text-[20px]" /><Icon name="arrow_drop_down" className="text-[18px]" /></button>
            {filter && (
              <div className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-ds-border-subtle bg-white p-3 shadow-xl">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ds-text-secondary">Situação</p>
                {STATUS_OPTIONS.map((s) => (
                  <label key={s} className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-ds-text-muted"><input type="checkbox" checked={status.includes(s)} onChange={(e) => { setStatus((cur) => (e.target.checked ? [...cur, s] : cur.filter((x) => x !== s))); setPage(1); }} className="h-4 w-4 accent-[#005CD2]" />{CONTRACT_STATUS[s].label}</label>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>

      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-ds-border-subtle bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr>{th("number", "Contrato", "pl-5")}<th className="px-3 py-3 text-center font-bold">Faturas</th>{th("billingDay", "Dia Venc.", "text-center")}{th("totalNet", "Valor", "text-right")}<th className="px-3 py-3 text-center font-bold">Status</th><th className="px-3 py-3 pr-5 text-center font-bold">Ações</th></tr></thead>
          <tbody>
            {!data ? <tr><td colSpan={6} className="py-12 text-center text-ds-text-secondary">Carregando...</td></tr> : data.lista.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-ds-text-secondary">Nenhum contrato encontrado.</td></tr> : data.lista.map((c) => (
              <tr key={c.id} className="border-t border-ds-border-subtle hover:bg-ds-bg/50">
                <td className="py-3 pl-5 pr-3"><Link href={`/contratos/${c.id}`} className="font-bold text-ds-primary hover:underline">{c.number}</Link><span className="text-ds-text"> - {c.personName}</span><span className="block text-xs text-ds-text-secondary">{fmtDoc(c.personDocument, c.personType)}</span></td>
                <td className="px-3 py-3 text-center"><span className="block font-bold text-ds-primary-deep">{c.activeInvoices}</span><span className="block text-[11px] text-ds-text-secondary">{c.activeInvoices === 1 ? "Fatura vigente" : "Faturas vigentes"}</span></td>
                <td className="px-3 py-3 text-center text-ds-text-muted">{String(c.billingDay).padStart(2, "0")}º dia</td>
                <td className="px-3 py-3 text-right font-bold text-ds-primary-deep">{money(c.totalNet)}</td>
                <td className="px-3 py-3 text-center"><span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CONTRACT_STATUS[c.status]?.cls ?? ""}`}>{CONTRACT_STATUS[c.status]?.label ?? c.status}</span></td>
                <td className="px-3 py-3 pr-5"><span className="flex justify-center gap-1.5">
                  <Link href={`/contratos/${c.id}`} aria-label="Editar contrato" title="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-primary hover:border-ds-primary"><Icon name="edit_square" className="text-[18px]" /></Link>
                  <button type="button" aria-label="Visualizar contrato" title="Visualizar contrato" onClick={() => router.push(`/contratos/${c.id}?imprimir=1`)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-primary hover:border-ds-primary"><Icon name="print" className="text-[18px]" /></button>
                </span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-ds-text-secondary">
        <span>{from} a {to} de {total} registros</span>
        <div className="flex items-center gap-1">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border disabled:opacity-40"><Icon name="chevron_left" className="text-[18px]" /></button>
          <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-ds-primary px-2 font-bold text-white">{page}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border disabled:opacity-40"><Icon name="chevron_right" className="text-[18px]" /></button>
        </div>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  return <PageShell permissionKey={CONTRATOS_KEY}>{() => <Contracts />}</PageShell>;
}
