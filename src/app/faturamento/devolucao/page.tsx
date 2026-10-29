"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Empty, Modal, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { FAT_KEYS, billing, dateBr, isoDay, type ReturnNote } from "@/lib/faturamento";

const STATUS = ["Autorizada", "Recusada", "Cancelada", "Não Emitida"];
const BADGE: Record<string, string> = { Autorizada: "bg-[#DDF6EA] text-[#0B7A4B]", Recusada: "bg-[#FDF0DD] text-[#B45309]", Cancelada: "bg-[#FDE6E4] text-[#B42318]", "Não Emitida": "bg-[#ECEFF3] text-[#5B6775]" };
const blank = { number: "", date: isoDay(new Date()), personName: "", kindLabel: "Devolução de Compra", originNf: "", status: "Não Emitida" };

function Returns() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<ReturnNote[] | null>(null);
  const [edit, setEdit] = useState<ReturnNote | "new" | "view" | null>(null);
  const [view, setView] = useState<ReturnNote | null>(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const load = useCallback(() => billing.returns({ q: term, status, from, to }).then(setRows).catch(() => setRows([])), [term, status, from, to]);
  useEffect(() => { void load(); }, [load]);

  const open = (r: ReturnNote | "new") => { setEdit(r); setError(""); setForm(r === "new" ? blank : { number: r.number ? String(r.number) : "", date: r.date.slice(0, 10), personName: r.personName, kindLabel: r.kindLabel, originNf: r.originNf, status: r.status }); };
  async function save() {
    setError("");
    try { await billing.saveReturn(edit === "new" || !edit || edit === "view" ? null : edit.id, { ...form, number: form.number ? Number(form.number) : null }); setEdit(null); void load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Devolução de Notas" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Notas Fiscais de Devolução</h1><button type="button" onClick={() => open("new")} className={btnPrimary}>Nova Devolução</button></header>
      <form onSubmit={(e) => { e.preventDefault(); setTerm(q); }} className={`${card} mb-4 flex flex-wrap items-center gap-2 p-3`}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Data inicial" className={`${field} w-40`} /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Data final" className={`${field} w-40`} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação" className={`${field} w-40`}><option value="">Todas</option>{STATUS.map((s) => <option key={s}>{s}</option>)}</select>
        <div className="relative min-w-[220px] flex-1"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ds-text-secondary" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome do cliente/fornecedor, Nº da Nota..." className={`${field} pl-10`} /></div>
        <button type="submit" className={btnPrimary}>Buscar</button>
      </form>
      <div className={`${card} overflow-x-auto`}><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th className="px-4 py-3 font-bold">#</th><th className="px-3 py-3 font-bold">Data</th><th className="px-3 py-3 font-bold">Cliente/Fornecedor</th><th className="px-3 py-3 font-bold">NF Origem</th><th className="px-3 py-3 text-center font-bold">Status</th><th className="px-4 py-3 text-center font-bold">Ações</th></tr></thead>
        <tbody>{!rows || rows.length === 0 ? <Empty cols={6} loading={!rows} text="Nenhuma nota de devolução." /> : rows.map((r) => <tr key={r.id} className="border-t border-ds-border-subtle"><td className="px-4 py-3 font-bold text-ds-primary">{r.number ? `#${r.number}` : "-"}</td><td className="px-3 py-3 text-ds-text-muted">{dateBr(r.date)}</td><td className="px-3 py-3 font-semibold text-ds-primary-deep">{r.personName}<span className="ml-2 rounded border border-ds-border px-1.5 text-[10px] font-semibold text-ds-text-muted">{r.kindLabel}</span></td><td className="px-3 py-3 text-ds-text-muted">#{r.originNf}</td><td className="px-3 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE[r.status] ?? ""}`}>{r.status}</span></td>
          <td className="px-4 py-3"><span className="flex justify-center gap-1.5"><button type="button" onClick={() => setView(r)} aria-label="Visualizar" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-primary hover:border-ds-primary"><Icon name="search" className="text-[18px]" /></button><button type="button" onClick={() => open(r)} aria-label="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-primary hover:border-ds-primary"><Icon name="edit_square" className="text-[18px]" /></button></span></td></tr>)}</tbody></table></div>
      {view && <Modal title={`Devolução ${view.number ? `#${view.number}` : ""}`} onClose={() => setView(null)}><dl className="grid gap-3 text-sm sm:grid-cols-2">{[["Cliente/Fornecedor", view.personName], ["Tipo", view.kindLabel], ["Data", dateBr(view.date)], ["NF de origem", `#${view.originNf}`], ["Status", view.status]].map(([k, v]) => <div key={k}><dt className="text-xs text-ds-text-secondary">{k}</dt><dd className="font-semibold text-ds-primary-deep">{v}</dd></div>)}</dl></Modal>}
      {edit && edit !== "view" && (
        <Modal title={edit === "new" ? "Nova Devolução" : "Editar Devolução"} onClose={() => setEdit(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className={label}>Cliente/Fornecedor *</span><input value={form.personName} onChange={(e) => setForm({ ...form, personName: e.target.value })} className={field} /></label>
            <label><span className={label}>Tipo</span><select value={form.kindLabel} onChange={(e) => setForm({ ...form, kindLabel: e.target.value })} className={field}><option>Devolução de Compra</option><option>Devolução de Venda</option></select></label>
            <label><span className={label}>Data *</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} /></label>
            <label><span className={label}>NF de origem *</span><input value={form.originNf} onChange={(e) => setForm({ ...form, originNf: e.target.value })} maxLength={20} className={field} /></label>
            <label><span className={label}>Número da devolução</span><input inputMode="numeric" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className={field} /></label>
            <label><span className={label}>Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={field}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
          <div className="mt-4 flex gap-2"><button type="button" className={btnPrimary} onClick={() => void save()}>Salvar</button><button type="button" className={btnGhost} onClick={() => setEdit(null)}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}

export default function ReturnsPage() { return <PageShell permissionKey={FAT_KEYS.devolucao}>{() => <Returns />}</PageShell>; }
