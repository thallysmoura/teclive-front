"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { btnGhost, btnPrimary, card, field } from "@/components/contratos/admin-ui";
import { money } from "@/lib/cadastros";
import { FAT_KEYS, OS_TYPES, billing, isoDay, pad, type OsRow } from "@/lib/faturamento";

function Orders() {
  const first = new Date(); first.setDate(1);
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [person, setPerson] = useState("");
  const [from, setFrom] = useState(isoDay(first));
  const [to, setTo] = useState(isoDay(new Date()));
  const [osType, setOsType] = useState("");
  const [billType, setBillType] = useState("");
  const [rows, setRows] = useState<OsRow[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => billing.orders({ tab, person, from: tab === "pending" ? from : undefined, to: tab === "pending" ? to : undefined, osType, billType }).then((r) => { setRows(r); setError(""); }).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")), [tab, person, from, to, osType, billType]);
  useEffect(() => { void load(); }, [load]);

  async function bill(r: OsRow) {
    if (!r.orderId || !confirm(`Faturar ${r.kind === "P" ? "produtos" : "serviços"} da OS ${pad(r.number)} (${money(r.value)})?`)) return;
    setBusy(r.key); setError(""); setMsg("");
    try { const inv = await billing.invoiceOrder(r.orderId, r.kind); setMsg(`Fatura ${pad(inv.number)} gerada.`); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível faturar."); } finally { setBusy(""); }
  }
  const tag = (k: "S" | "P") => <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${k === "P" ? "bg-[#005CD2]" : "bg-[#12A262]"}`}>Fatura de {k === "P" ? "Produtos" : "Serviços"}</span>;

  return (
    <div className="mx-auto max-w-[1100px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Faturamento de Ordem de Serviço" }]} />
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-ds-primary-deep">Faturamento de Ordem de Serviço</h1>
      <nav role="tablist" className="flex gap-1">{([["pending", "A Faturar"], ["done", "Faturadas"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => { setTab(k); setRows(null); }} className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold ${tab === k ? "border-ds-border-subtle border-t-[3px] border-t-[#F7941D] bg-white text-ds-primary-deep" : "border-transparent text-ds-text-muted"}`}>{l}</button>)}</nav>
      <div className={`${card} rounded-tl-none`}>
        <form onSubmit={(e) => { e.preventDefault(); void load(); }} className="grid gap-3 border-b border-ds-border-subtle p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-ds-text-secondary sm:col-span-2">Cliente<input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Nome do cliente" className={`${field} mt-1`} /></label>
          {tab === "pending" && <><label className="text-xs font-bold text-ds-text-secondary">Data Fechamento Inicial<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${field} mt-1`} /></label><label className="text-xs font-bold text-ds-text-secondary">Data Fechamento Final<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${field} mt-1`} /></label>
          <label className="text-xs font-bold text-ds-text-secondary">Tipo de Ordem de Serviço<select value={osType} onChange={(e) => setOsType(e.target.value)} className={`${field} mt-1`}><option value="">- Selecione -</option>{Object.entries(OS_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label></>}
          <label className="text-xs font-bold text-ds-text-secondary">Tipo de Faturamento<select value={billType} onChange={(e) => setBillType(e.target.value)} className={`${field} mt-1`}><option value="">Todos</option><option value="P">Produtos</option><option value="S">Serviços</option></select></label>
          <div className="flex items-end gap-2"><button type="submit" className={btnPrimary}>Pesquisar</button><button type="button" onClick={() => { setPerson(""); setOsType(""); setBillType(""); setFrom(isoDay(first)); setTo(isoDay(new Date())); }} className={btnGhost}>Limpar</button></div>
        </form>
        {error && <p role="alert" className="m-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
        {msg && <p role="status" className="m-3 rounded-lg bg-[#DDF6EA] px-3 py-2 text-sm font-semibold text-[#0B7A4B]">{msg}</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th className="px-4 py-3 font-bold">Ordem de Serviço</th><th className="px-4 py-3 text-right font-bold">Valor Líquido</th><th className="px-4 py-3 text-center font-bold">Ações</th></tr></thead>
          <tbody>{!rows ? <tr><td colSpan={3} className="py-10 text-center text-ds-text-secondary">Carregando...</td></tr> : rows.length === 0 ? <tr><td colSpan={3} className="py-10 text-center text-ds-text-secondary">{tab === "pending" ? "Nenhuma OS a faturar no período." : "Nenhuma OS faturada."}</td></tr> : rows.map((r) => (
            <tr key={r.key} className="border-t border-ds-border-subtle"><td className="px-4 py-3"><span className="font-bold text-ds-primary">{pad(r.number)}</span> - <span className="font-semibold text-ds-primary-deep">{r.personName}</span><p className="mt-0.5 text-xs text-ds-text-secondary">{tag(r.kind)}{r.address}</p></td><td className="px-4 py-3 text-right font-semibold">{money(r.value)}</td>
              <td className="px-4 py-3 text-center">{tab === "pending" ? <button type="button" disabled={busy === r.key} onClick={() => void bill(r)} className="inline-flex h-8 items-center rounded-lg border border-ds-border px-3 text-xs font-bold text-ds-primary-deep hover:border-ds-primary disabled:opacity-50">{busy === r.key ? "..." : "Faturar"}</button> : <Link href={`/faturamento/central/${r.invoiceId}`} className="text-xs font-bold text-ds-primary hover:underline">Fatura #{r.invoiceNumber}</Link>}</td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}

export default function OrdersBillingPage() { return <PageShell permissionKey={FAT_KEYS.os}>{() => <Orders />}</PageShell>; }
