"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Empty, Modal, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { money } from "@/lib/cadastros";
import { FAT_KEYS, billing, dateBr, download, isoDay, type Purchase } from "@/lib/faturamento";

const OPERATIONS = ["Compra de Equipamentos Revenda (Notas Fiscais de Entrada)", "Compra de Material de Uso e Consumo", "Compra de Mercadorias para Prestação de Serviço"];
const STATUS = ["Salva", "Lançada", "Cancelada"];
const BADGE: Record<string, string> = { Salva: "bg-[#FDF0DD] text-[#B45309]", Lançada: "bg-[#DDF6EA] text-[#0B7A4B]", Cancelada: "bg-[#FDE6E4] text-[#B42318]" };

function Purchases() {
  const first = new Date(); first.setDate(1);
  const [f, setF] = useState({ supplier: "", dateType: "entry", from: isoDay(first), to: isoDay(new Date()), operation: "", status: "", number: "" });
  const [rows, setRows] = useState<Purchase[] | null>(null);
  const [edit, setEdit] = useState<Purchase | "new" | null>(null);
  const [form, setForm] = useState({ number: "", supplierName: "", entryDate: isoDay(new Date()), issueDate: isoDay(new Date()), operation: OPERATIONS[0], total: "", status: "Salva" });
  const [error, setError] = useState("");
  const load = useCallback(() => billing.purchases(f).then(setRows).catch(() => setRows([])), [f]);
  useEffect(() => { void load(); }, [load]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  const open = (p: Purchase | "new") => { setEdit(p); setError(""); setForm(p === "new" ? { number: "", supplierName: "", entryDate: isoDay(new Date()), issueDate: isoDay(new Date()), operation: OPERATIONS[0], total: "", status: "Salva" } : { number: p.number, supplierName: p.supplierName, entryDate: p.entryDate.slice(0, 10), issueDate: p.issueDate.slice(0, 10), operation: p.operation, total: String(p.total).replace(".", ","), status: p.status }); };
  async function save() {
    setError("");
    try { await billing.savePurchase(edit === "new" || !edit ? null : edit.id, { ...form, total: Number(form.total.replace(/\./g, "").replace(",", ".")) }); setEdit(null); void load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
  }
  const exportCsv = () => download("notas-entrada.csv", `﻿Nota;Fornecedor;Operação;Entrada;Emissão;Valor;Status\n${(rows ?? []).map((r) => [r.number, r.supplierName, r.operation, dateBr(r.entryDate), dateBr(r.issueDate), r.total.toFixed(2).replace(".", ","), r.status].join(";")).join("\n")}`, "text/csv;charset=utf-8");

  return (
    <div className="mx-auto max-w-[1100px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Notas Fiscais de Entrada" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Listagem de Notas Fiscais de Entrada</h1><div className="flex gap-2"><button type="button" onClick={exportCsv} className={`${btnGhost} gap-1.5`}><Icon name="download" className="text-[18px]" />Exportar</button><button type="button" onClick={() => open("new")} className={btnPrimary}>Nova Entrada</button></div></header>
      <form onSubmit={(e) => { e.preventDefault(); void load(); }} className={`${card} mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4`}>
        <label className="text-xs font-bold text-ds-text-secondary">Fornecedor<input value={f.supplier} onChange={(e) => set({ supplier: e.target.value })} className={`${field} mt-1`} /></label>
        <label className="text-xs font-bold text-ds-text-secondary">Tipo de Data<select value={f.dateType} onChange={(e) => set({ dateType: e.target.value })} className={`${field} mt-1`}><option value="entry">Data Entrada</option><option value="issue">Data Emissão</option></select></label>
        <label className="text-xs font-bold text-ds-text-secondary">Data Inicial<input type="date" value={f.from} onChange={(e) => set({ from: e.target.value })} className={`${field} mt-1`} /></label>
        <label className="text-xs font-bold text-ds-text-secondary">Data Final<input type="date" value={f.to} onChange={(e) => set({ to: e.target.value })} className={`${field} mt-1`} /></label>
        <label className="text-xs font-bold text-ds-text-secondary">Operação de Faturamento<select value={f.operation} onChange={(e) => set({ operation: e.target.value })} className={`${field} mt-1`}><option value="">Todas</option>{OPERATIONS.map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="text-xs font-bold text-ds-text-secondary">Status<select value={f.status} onChange={(e) => set({ status: e.target.value })} className={`${field} mt-1`}><option value="">Todos</option>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="text-xs font-bold text-ds-text-secondary">Número da Nota Fiscal<input value={f.number} onChange={(e) => set({ number: e.target.value })} className={`${field} mt-1`} /></label>
        <div className="flex items-end gap-2"><button type="submit" className={btnPrimary}>Pesquisar</button><button type="button" onClick={() => setF({ supplier: "", dateType: "entry", from: "", to: "", operation: "", status: "", number: "" })} className={btnGhost}>Limpar</button></div>
      </form>
      <div className={`${card} overflow-x-auto`}><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th className="px-4 py-3 font-bold">Nota Fiscal<span className="block font-normal">Data Entrada</span></th><th className="px-3 py-3 font-bold">Fornecedor<span className="block font-normal">Operação de Faturamento</span></th><th className="px-3 py-3 font-bold">Data Emissão</th><th className="px-3 py-3 text-right font-bold">Valor Total da Nota</th><th className="px-3 py-3 text-center font-bold">Status</th><th className="px-4 py-3 text-center font-bold">Ações</th></tr></thead>
        <tbody>{!rows || rows.length === 0 ? <Empty cols={6} loading={!rows} text="Nenhuma Nota Fiscal para Exibir." /> : rows.map((r) => <tr key={r.id} className="border-t border-ds-border-subtle"><td className="px-4 py-3 font-bold text-ds-primary">{r.number}<span className="block text-xs font-normal text-ds-text-secondary">{dateBr(r.entryDate)}</span></td><td className="px-3 py-3 font-semibold text-ds-primary-deep">{r.supplierName}<span className="block text-xs font-normal text-ds-text-secondary">{r.operation}</span></td><td className="px-3 py-3 text-ds-text-muted">{dateBr(r.issueDate)}</td><td className="px-3 py-3 text-right font-semibold">{money(r.total)}</td><td className="px-3 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE[r.status]}`}>{r.status}</span></td><td className="px-4 py-3 text-center"><button type="button" onClick={() => open(r)} aria-label="Editar nota" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-primary hover:border-ds-primary"><Icon name="edit_square" className="text-[18px]" /></button></td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-ds-text-secondary">{rows?.length ?? 0} registros</p>
      {edit && (
        <Modal title={edit === "new" ? "Nova Entrada" : "Editar Nota de Entrada"} onClose={() => setEdit(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Número da NF *</span><input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} maxLength={20} className={field} /></label>
            <label><span className={label}>Valor total (R$) *</span><input inputMode="decimal" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className={field} /></label>
            <label className="sm:col-span-2"><span className={label}>Fornecedor *</span><input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} className={field} /></label>
            <label><span className={label}>Data de entrada *</span><input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} className={field} /></label>
            <label><span className={label}>Data de emissão *</span><input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className={field} /></label>
            <label className="sm:col-span-2"><span className={label}>Operação de faturamento</span><select value={form.operation} onChange={(e) => setForm({ ...form, operation: e.target.value })} className={field}>{OPERATIONS.map((o) => <option key={o}>{o}</option>)}</select></label>
            <label><span className={label}>Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={field}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
          <div className="mt-4 flex gap-2"><button type="button" className={btnPrimary} onClick={() => void save()}>Salvar</button><button type="button" className={btnGhost} onClick={() => setEdit(null)}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}

export default function PurchasesPage() { return <PageShell permissionKey={FAT_KEYS.compras}>{() => <Purchases />}</PageShell>; }
