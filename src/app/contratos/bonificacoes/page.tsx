"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { ContractPicker, Empty, Modal, Pill, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { BONIF_KEY, adminApi, type Charge } from "@/lib/contratos";
import { money } from "@/lib/cadastros";

const today = new Date();
const comp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const fmtComp = (c: string) => `${c.slice(5)}/${c.slice(0, 4)}`;

function Charges() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [canceled, setCanceled] = useState(false);
  const [rows, setRows] = useState<Charge[] | null>(null);
  const [open, setOpen] = useState(false);
  const [contract, setContract] = useState<{ id: string; label: string } | null>(null);
  const [kind, setKind] = useState("0");
  const [competence, setCompetence] = useState(comp);
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => adminApi.charges(term, canceled).then(setRows).catch(() => setRows([])), [term, canceled]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    setError("");
    try {
      await adminApi.createCharge({ contractId: contract?.id, kind: Number(kind), competence, description, value: Number(value.replace(",", ".")) });
      setOpen(false); setContract(null); setDescription(""); setValue(""); void load();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Bonificações/Despesas" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Listagem de Bonificações/Despesas de Contratos</h1>
        <button type="button" onClick={() => { setOpen(true); setError(""); }} className={btnPrimary}>Nova Bonificação/Despesa</button>
      </header>
      <form onSubmit={(e) => { e.preventDefault(); setTerm(q); }} className={`${card} mb-3 flex flex-wrap items-center gap-3 p-3`}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquise por identificador, nome do cliente ..." className={`${field} min-w-[220px] flex-1`} />
        <label className="flex items-center gap-2 text-sm text-ds-text-muted"><input type="checkbox" checked={canceled} onChange={(e) => setCanceled(e.target.checked)} className="h-4 w-4 accent-[#005CD2]" />Exibir cancelados</label>
        <button type="submit" className={btnPrimary}>Pesquisar</button>
        <button type="button" onClick={() => { setQ(""); setTerm(""); setCanceled(false); }} className={btnGhost}>Limpar</button>
      </form>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th className="px-5 py-3 font-bold">Contrato</th><th className="px-3 py-3 text-center font-bold">Competência</th><th className="px-3 py-3 text-center font-bold">Status</th><th className="px-3 py-3 text-right font-bold">Valor</th><th className="px-5 py-3 text-center font-bold">Ações</th></tr></thead>
          <tbody>
            {!rows || rows.length === 0 ? <Empty cols={5} loading={!rows} text="Não há bonificações/despesas de contrato à exibir." /> : rows.map((c) => (
              <tr key={c.id} className="border-t border-ds-border-subtle hover:bg-ds-bg/50">
                <td className="px-5 py-3"><span className="font-bold text-ds-primary">{c.contractNo}</span><span className="text-ds-text"> - {c.personName}</span><span className="block text-xs text-ds-text-secondary">{c.kind === 0 ? "Bonificação" : "Despesa"}: {c.description}</span></td>
                <td className="px-3 py-3 text-center text-ds-text-muted">{fmtComp(c.competence)}</td>
                <td className="px-3 py-3 text-center"><Pill ok={!c.canceledAt} on="Lançado" off="Cancelado" /></td>
                <td className={`px-3 py-3 text-right font-bold ${c.kind === 0 ? "text-[#0B7A4B]" : "text-[#B42318]"}`}>{c.kind === 0 ? "-" : ""}{money(c.value)}</td>
                <td className="px-5 py-3 text-center">{!c.canceledAt && <button type="button" onClick={() => { if (confirm("Cancelar este lançamento?")) void adminApi.cancelCharge(c.id).then(load); }} className="text-xs font-bold text-ds-danger-text hover:underline">Cancelar</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ds-text-secondary">{rows?.length ?? 0} registros</p>

      {open && (
        <Modal title="Nova Bonificação/Despesa" onClose={() => setOpen(false)}>
          <div className="grid gap-4">
            <div><span className={label}>Contrato *</span><ContractPicker value={contract} onPick={setContract} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={label}>Tipo *</span><select value={kind} onChange={(e) => setKind(e.target.value)} className={field}><option value="0">Bonificação (desconto)</option><option value="1">Despesa (acréscimo)</option></select></label>
              <label><span className={label}>Competência *</span><input type="month" value={competence} onChange={(e) => setCompetence(e.target.value)} className={field} /></label>
            </div>
            <label><span className={label}>Descrição *</span><input value={description} onChange={(e) => setDescription(e.target.value)} className={field} maxLength={200} /></label>
            <label><span className={label}>Valor (R$) *</span><input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" className={field} /></label>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
          <div className="mt-5 flex gap-2"><button type="button" onClick={() => void save()} className={btnPrimary}>Salvar</button><button type="button" onClick={() => setOpen(false)} className={btnGhost}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}

export default function ChargesPage() { return <PageShell permissionKey={BONIF_KEY}>{() => <Charges />}</PageShell>; }
