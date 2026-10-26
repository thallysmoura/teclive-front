"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { ContractPicker, Modal, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { CANCEL_KEY, CANCEL_STAGES, adminApi, dateBr, type Cancellation } from "@/lib/contratos";
import { money } from "@/lib/cadastros";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const COLORS = ["#F7941D", "#005CD2", "#9B7BFF", "#0B7A4B", "#B42318", "#5B6775", "#0B7A4B"];

function Central() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<Cancellation[]>([]);
  const [open, setOpen] = useState(false);
  const [contract, setContract] = useState<{ id: string; label: string } | null>(null);
  const [date, setDate] = useState(iso(new Date()));
  const [fine, setFine] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState<string | null>(null);

  const load = useCallback(() => adminApi.cancellations(term).then(setRows).catch(() => setRows([])), [term]);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    setError("");
    try { await adminApi.createCancellation({ contractId: contract?.id, effectiveDate: date, fine: Number(fine.replace(",", ".")) || 0, reason }); setOpen(false); setContract(null); setFine(""); setReason(""); void load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
  }
  const move = (id: string, stage: number) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, stage } : x)));
    void adminApi.moveCancellation(id, stage).then(load).catch(() => { setError("Não foi possível mover o cartão."); void load(); });
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <Breadcrumb items={[{ label: "Home", href: "/home" }, { label: "Central de Cancelamento" }]} />
      <form onSubmit={(e) => { e.preventDefault(); setTerm(q); }} className={`${card} mb-4 flex flex-wrap items-center gap-3 p-3`}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquise ou filtre os resultados" className={`${field} min-w-[220px] flex-1`} />
        <button type="submit" className={btnPrimary}>Pesquisar</button>
        <button type="button" onClick={() => { setQ(""); setTerm(""); }} className={`${btnGhost} gap-1`}><Icon name="refresh" className="text-[18px]" />Limpar</button>
        <button type="button" onClick={() => { setOpen(true); setError(""); }} className={btnPrimary}>Novo Cancelamento</button>
      </form>
      {error && !open && <p role="alert" className="mb-3 text-sm text-ds-danger-text">{error}</p>}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {CANCEL_STAGES.map((name, stage) => {
          const items = rows.filter((r) => r.stage === stage);
          return (
            <section key={name} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag) { move(drag, stage); setDrag(null); } }} className="flex min-h-[420px] w-[280px] shrink-0 flex-col rounded-xl border border-ds-border-subtle bg-white shadow-sm" style={{ borderTop: `3px solid ${COLORS[stage]}` }}>
              <h2 className="flex items-center justify-between px-3 py-3 text-sm font-bold text-ds-primary-deep">{name}<span className="rounded-full bg-ds-bg px-2 text-xs">{items.length}</span></h2>
              <ul className="flex-1 space-y-2 px-2 pb-2">
                {items.map((c) => (
                  <li key={c.id} draggable onDragStart={() => setDrag(c.id)} className="cursor-grab rounded-lg border border-ds-border-subtle bg-ds-bg/40 p-3 text-sm">
                    <p className="font-bold text-ds-primary">{c.contractNo}</p>
                    <p className="text-ds-text">{c.personName}</p>
                    <p className="mt-1 text-xs text-ds-text-secondary">Cancelar em {dateBr(c.effectiveDate)}{c.fine > 0 ? ` · multa ${money(c.fine)}` : ""}</p>
                    {c.reason && <p className="mt-1 line-clamp-2 text-xs text-ds-text-muted">{c.reason}</p>}
                    <div className="mt-2 flex gap-1">
                      <button type="button" disabled={stage === 0} onClick={() => move(c.id, stage - 1)} aria-label="Etapa anterior" className="flex h-7 w-7 items-center justify-center rounded-md border border-ds-border text-ds-primary disabled:opacity-30"><Icon name="chevron_left" className="text-[18px]" /></button>
                      <button type="button" disabled={stage === CANCEL_STAGES.length - 1} onClick={() => move(c.id, stage + 1)} aria-label="Próxima etapa" className="flex h-7 w-7 items-center justify-center rounded-md border border-ds-border text-ds-primary disabled:opacity-30"><Icon name="chevron_right" className="text-[18px]" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {open && (
        <Modal title="Novo Cancelamento" onClose={() => setOpen(false)}>
          <div className="grid gap-4">
            <div><span className={label}>Contrato *</span><ContractPicker value={contract} onPick={setContract} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={label}>Data do cancelamento *</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
              <label><span className={label}>Multa (R$)</span><input inputMode="decimal" value={fine} onChange={(e) => setFine(e.target.value)} placeholder="0,00" className={field} /></label>
            </div>
            <label><span className={label}>Motivo</span><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-[10px] border border-ds-border px-3 py-2 text-sm outline-none focus:border-ds-primary" /></label>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
          <div className="mt-5 flex gap-2"><button type="button" onClick={() => void create()} className={btnPrimary}>Salvar</button><button type="button" onClick={() => setOpen(false)} className={btnGhost}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}

export default function CancelPage() { return <PageShell permissionKey={CANCEL_KEY}>{() => <Central />}</PageShell>; }
