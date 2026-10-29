"use client";

import { useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { money } from "@/lib/cadastros";
import { FIN_KEYS, dateBr, download, fin, isoDay, type CashAccount } from "@/lib/financeiro";

function Statement() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [type, setType] = useState("");
  const [from, setFrom] = useState(isoDay(new Date()));
  const [to, setTo] = useState(isoDay(new Date()));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [user, setUser] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof fin.statement>> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void fin.cashAccounts().then((a) => { setAccounts(a); setPicked(new Set(a.map((x) => x.id))); }).catch(() => undefined); }, []);

  async function generate() {
    setError("");
    try { setData(await fin.statement({ type, from, to, accounts: [...picked].join(","), user })); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível gerar."); }
  }
  const exportCsv = () => data && download("extrato-caixa.csv", `﻿Data;Conta;Descrição;Pessoa;Valor;Usuário\n${data.lista.map((m) => [dateBr(m.date), m.account, m.description, m.personName, m.value.toFixed(2).replace(".", ","), m.user].join(";")).join("\n")}`, "text/csv;charset=utf-8");

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="print:hidden"><Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Extrato de Movimento de Caixa" }]} /></div>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-ds-primary-deep print:hidden">Relatório de Extrato de Movimento de Caixa</h1>
      <div className={`${card} grid gap-5 p-5 print:hidden md:grid-cols-2`}>
        <div><span className={label}>Tipo Movimento</span><div className="flex gap-2">{[["", "Todos"], ["OUT", "Pagamentos"], ["IN", "Recebimentos"]].map(([k, l]) => <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)} className={`h-10 rounded-[10px] border px-3 text-sm font-bold ${type === k ? "border-ds-primary bg-ds-primary text-white" : "border-ds-border bg-white text-ds-primary-deep"}`}>{l}</button>)}</div></div>
        <div className="grid grid-cols-2 gap-3"><label><span className={label}>Período (de)</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} /></label><label><span className={label}>até</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} /></label></div>
        <div><span className={label}>Movimento nas Contas de Caixa</span><ul className="grid gap-1 sm:grid-cols-2">{accounts.map((a) => <li key={a.id}><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={picked.has(a.id)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(a.id); else n.delete(a.id); return n; })} className="h-4 w-4 accent-[#005CD2]" />{a.name}</label></li>)}</ul></div>
        <label><span className={label}>Movimentado pelo Usuário</span><input value={user} onChange={(e) => setUser(e.target.value)} placeholder="- Todos - (digite o nome exato)" className={field} /></label>
        <div className="md:col-span-2"><button type="button" onClick={() => void generate()} className={btnPrimary}>Gerar Relatório</button><p className="mt-2 text-xs text-ds-text-secondary">Veja suas movimentações de entradas e saídas, geração de caixa e o saldo do caixa por período.</p></div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
      {data && (
        <div className={`${card} mt-5 p-5`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-ds-primary-deep">Extrato · {dateBr(from)} a {dateBr(to)}</h2><div className="flex gap-2 print:hidden"><button type="button" onClick={exportCsv} className={`${btnGhost} gap-1.5`}><Icon name="download" className="text-[18px]" />CSV</button><button type="button" onClick={() => window.print()} className={`${btnGhost} gap-1.5`}><Icon name="print" className="text-[18px]" />Imprimir</button></div></div>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">{[["Entradas", data.inflow, "text-[#0B7A4B]"], ["Saídas", data.outflow, "text-[#B42318]"], ["Geração de caixa", data.inflow + data.outflow, "text-ds-primary-deep"]].map(([l, v, c]) => <div key={String(l)} className="rounded-xl border border-ds-border-subtle bg-ds-bg/50 p-3"><p className="text-xs text-ds-text-secondary">{l}</p><p className={`text-lg font-extrabold ${c}`}>{money(Number(v))}</p></div>)}</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th className="py-2 font-bold">Data</th><th className="py-2 font-bold">Conta</th><th className="py-2 font-bold">Descrição</th><th className="py-2 text-right font-bold">Valor</th></tr></thead><tbody>{data.lista.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-ds-text-secondary">Nenhum movimento no período.</td></tr>}{data.lista.map((m) => <tr key={m.id} className="border-t border-ds-border-subtle"><td className="py-2 text-ds-text-muted">{dateBr(m.date)}</td><td className="py-2">{m.account}</td><td className="py-2"><b className="text-ds-primary-deep">{m.personName}</b><span className="block text-xs text-ds-text-secondary">{m.description}</span></td><td className={`py-2 text-right font-semibold ${m.value < 0 ? "text-[#B42318]" : "text-[#0B7A4B]"}`}>{money(m.value)}</td></tr>)}</tbody></table></div>
        </div>
      )}
    </div>
  );
}

export default function StatementPage() { return <PageShell permissionKey={FIN_KEYS.extrato}>{() => <Statement />}</PageShell>; }
