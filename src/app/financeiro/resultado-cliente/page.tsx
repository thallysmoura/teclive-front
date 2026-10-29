"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { btnGhost, btnPrimary, card, field } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { money } from "@/lib/cadastros";
import { FIN_KEYS, download, fin } from "@/lib/financeiro";

function ByClient() {
  const [person, setPerson] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fin.byClient>> | null>(null);
  const load = useCallback(() => fin.byClient({ person, from, to }).then(setRows).catch(() => setRows([])), [person, from, to]);
  useEffect(() => { void load(); }, [load]);
  const cell = (v: number) => <td className="px-3 py-3 text-right tabular-nums">{money(v)}</td>;
  const totals = (rows ?? []).reduce((t, r) => ({ r: t.r + r.recurrence, m: t.m + r.maintenance, x: t.x + r.result }), { r: 0, m: 0, x: 0 });
  const exportCsv = () => rows && download("resultado-por-cliente.csv", `﻿Cliente;Recorrência;Manutenção;Deslocamento;Rateio despesas;Bonificação;Resultado\n${rows.map((r) => [r.client, r.recurrence, r.maintenance, r.travel, r.allocation, r.bonus, r.result].map((v) => (typeof v === "number" ? v.toFixed(2).replace(".", ",") : v)).join(";")).join("\n")}`, "text/csv;charset=utf-8");

  return (
    <div className="mx-auto max-w-[1100px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Resultado por Cliente" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Relatório de Resultado por Cliente</h1><button type="button" onClick={exportCsv} className={`${btnGhost} gap-1.5`}><Icon name="download" className="text-[18px]" />Exportar Planilha</button></header>
      <div className={`${card} mb-4 flex flex-wrap items-end gap-3 p-3`}><label className="min-w-[220px] flex-1 text-xs font-bold text-ds-text-secondary">Cliente<input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Nome do cliente" className={`${field} mt-1`} /></label><label className="text-xs font-bold text-ds-text-secondary">Período (de)<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${field} mt-1 w-40`} /></label><label className="text-xs font-bold text-ds-text-secondary">até<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${field} mt-1 w-40`} /></label><button type="button" onClick={() => { setPerson(""); setFrom(""); setTo(""); }} className={btnPrimary}>Limpar</button></div>
      <div className={`${card} overflow-x-auto`}><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th rowSpan={2} className="px-4 py-3 align-bottom font-bold">Cliente</th><th rowSpan={2} className="px-3 py-3 text-right align-bottom font-bold">Recorrência</th><th colSpan={4} className="border-b border-ds-border-subtle px-3 py-2 text-center font-bold">Custo Total</th><th rowSpan={2} className="px-4 py-3 text-right align-bottom font-bold">Resultado</th></tr><tr>{["Manutenção", "Deslocamento", "Rateio despesas", "Bonificação"].map((h) => <th key={h} className="px-3 py-2 text-right font-bold">{h}</th>)}</tr></thead>
        <tbody>{!rows ? <tr><td colSpan={7} className="py-10 text-center text-ds-text-secondary">Carregando...</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-ds-text-secondary">Nenhum resultado no período.</td></tr> : rows.map((r) => <tr key={r.client} className="border-t border-ds-border-subtle"><td className="px-4 py-3 font-semibold text-ds-primary-deep">{r.client}</td>{cell(r.recurrence)}{cell(r.maintenance)}{cell(r.travel)}{cell(r.allocation)}{cell(r.bonus)}<td className={`px-4 py-3 text-right font-bold tabular-nums ${r.result < 0 ? "text-[#B42318]" : "text-[#0B7A4B]"}`}>{money(r.result)}</td></tr>)}</tbody>
        {rows && rows.length > 0 && <tfoot><tr className="border-t-2 border-ds-border bg-ds-bg/60 font-extrabold"><td className="px-4 py-3">Total</td>{cell(totals.r)}{cell(totals.m)}<td /><td /><td /><td className="px-4 py-3 text-right tabular-nums">{money(totals.x)}</td></tr></tfoot>}</table></div>
      <p className="mt-3 text-xs text-ds-text-secondary">{rows?.length ?? 0} registros · Recorrência = faturas de contratos do período; os custos entram quando houver lançamentos de despesa por cliente.</p>
    </div>
  );
}

export default function ByClientPage() { return <PageShell permissionKey={FIN_KEYS.resultadoCliente}>{() => <ByClient />}</PageShell>; }
