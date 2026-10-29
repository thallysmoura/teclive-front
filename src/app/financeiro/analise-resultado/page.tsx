"use client";

import { useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { btnGhost, card } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { FIN_KEYS, MONTHS, download, fin } from "@/lib/financeiro";

type Row = { name: string; planned: number[]; done: number[] };
const f2 = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sum = (rows: Row[], k: "planned" | "done") => MONTHS.map((_, m) => rows.reduce((s, r) => s + r[k][m], 0));
const total = (a: number[]) => a.reduce((s, n) => s + n, 0);

function Analysis() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<Awaited<ReturnType<typeof fin.analysis>> | null>(null);
  const [showPlanned, setShowPlanned] = useState(true);
  const [showDone, setShowDone] = useState(true);
  const [hideEmpty, setHideEmpty] = useState(false);
  useEffect(() => { setData(null); void fin.analysis(year).then(setData).catch(() => undefined); }, [year]);

  const cols = MONTHS.flatMap((m, i) => [...(showPlanned ? [{ m: i, k: "planned" as const }] : []), ...(showDone ? [{ m: i, k: "done" as const }] : [])]);
  const line = (name: string, p: number[], d: number[], cls = "", key?: string) => {
    if (hideEmpty && total(p) === 0 && total(d) === 0) return null;
    return (
      <tr key={key ?? name} className={`border-t border-ds-border-subtle ${cls}`}>
        <th scope="row" className="sticky left-0 z-10 min-w-[240px] bg-inherit px-3 py-2 text-left font-semibold">{name}</th>
        {MONTHS.map((m, i) => <>{showPlanned && <td key={`${m}p`} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{f2(p[i])}</td>}{showDone && <td key={`${m}d`} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{f2(d[i])}</td>}</>)}
        {showPlanned && <td className="whitespace-nowrap px-2 py-2 text-right font-bold tabular-nums">{f2(total(p))}</td>}{showDone && <td className="whitespace-nowrap px-2 py-2 text-right font-bold tabular-nums">{f2(total(d))}</td>}
      </tr>
    );
  };
  const exportCsv = () => {
    if (!data) return;
    const head = ["Categoria", ...MONTHS.flatMap((m) => [`${m}/${year} Previsto`, `${m}/${year} Realizado`]), "Total Previsto", "Total Realizado"];
    const out = [...data.receipts.map((r) => ["Receita - " + r.name, r]), ...data.payments.map((r) => ["Pagamento - " + r.name, r])] as [string, Row][];
    const csv = `﻿${head.join(";")}\n${out.map(([n, r]) => [n, ...MONTHS.flatMap((_, i) => [r.planned[i], r.done[i]].map((v) => v.toFixed(2).replace(".", ","))), total(r.planned).toFixed(2).replace(".", ","), total(r.done).toFixed(2).replace(".", ",")].join(";")).join("\n")}`;
    download(`analise-resultado-${year}.csv`, csv, "text/csv;charset=utf-8");
  };

  const rp = data ? sum(data.receipts, "planned") : Array(12).fill(0), rd = data ? sum(data.receipts, "done") : Array(12).fill(0);
  const pp = data ? sum(data.payments, "planned") : Array(12).fill(0), pd = data ? sum(data.payments, "done") : Array(12).fill(0);

  return (
    <div className="mx-auto max-w-[1400px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Análise de Resultado Financeiro" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Análise de Resultado Financeiro</h1><div className="flex items-center gap-2"><button type="button" onClick={() => setYear((y) => y - 1)} aria-label="Ano anterior" className={btnGhost}><Icon name="chevron_left" className="text-[18px]" /></button><span className="text-lg font-extrabold text-ds-primary-deep">{year}</span><button type="button" onClick={() => setYear((y) => y + 1)} aria-label="Próximo ano" className={btnGhost}><Icon name="chevron_right" className="text-[18px]" /></button><button type="button" onClick={exportCsv} className={`${btnGhost} gap-1.5`}><Icon name="download" className="text-[18px]" />Exportar Planilha</button></div></header>
      <div className={`${card} mb-4 flex flex-wrap items-center gap-4 p-3 text-sm`}><span className="font-semibold text-ds-text-muted">Colunas:</span><label className="flex items-center gap-1.5"><input type="checkbox" checked={showPlanned} onChange={(e) => setShowPlanned(e.target.checked)} className="h-4 w-4 accent-[#005CD2]" />Previsto</label><label className="flex items-center gap-1.5"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="h-4 w-4 accent-[#005CD2]" />Realizado</label><label className="flex items-center gap-1.5"><input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="h-4 w-4 accent-[#005CD2]" />Ocultar linhas sem valores</label></div>
      <div className={`${card} overflow-x-auto`}>
        {!data ? <p className="py-12 text-center text-sm text-ds-text-secondary">Carregando...</p> : (
          <table className="w-full min-w-[1100px] border-collapse text-xs">
            <thead className="bg-ds-bg/60"><tr><th rowSpan={2} className="sticky left-0 z-10 bg-ds-bg px-3 py-2 text-left">Categorias de Lançamentos</th>{MONTHS.map((m) => <th key={m} colSpan={(showPlanned ? 1 : 0) + (showDone ? 1 : 0)} className="border-l border-ds-border-subtle px-2 py-2 text-center">{m}/{year}</th>)}<th colSpan={(showPlanned ? 1 : 0) + (showDone ? 1 : 0)} className="border-l border-ds-border-subtle px-2 py-2 text-center">Total</th></tr>
              <tr>{Array.from({ length: 13 }).flatMap((_, i) => [...(showPlanned ? [<th key={`${i}p`} className="border-l border-ds-border-subtle px-2 py-1 text-right font-semibold">Previsto</th>] : []), ...(showDone ? [<th key={`${i}d`} className="px-2 py-1 text-right font-semibold">Realizado</th>] : [])])}</tr></thead>
            <tbody>
              {line("Total de Recebimentos", rp, rd, "bg-[#E7F6EE] font-extrabold text-[#0B7A4B]")}
              {data.receipts.map((r) => line(r.name, r.planned, r.done, "bg-white", `r-${r.name}`))}
              {line("Total de Pagamentos", pp, pd, "bg-[#FDE6E4] font-extrabold text-[#B42318]")}
              {data.payments.map((r) => line(r.name, r.planned, r.done, "bg-white", `p-${r.name}`))}
              {line("Resultado (Recebimentos - Pagamentos)", rp.map((v, i) => v - pp[i]), rd.map((v, i) => v - pd[i]), "bg-ds-bg font-extrabold text-ds-primary-deep")}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-ds-text-secondary">Previsto = contas por vencimento; Realizado = contas liquidadas por data de baixa. Contas sem categoria aparecem em "Sem categoria".</p>
    </div>
  );
}

export default function AnalysisPage() { return <PageShell permissionKey={FIN_KEYS.analise}>{() => <Analysis />}</PageShell>; }
