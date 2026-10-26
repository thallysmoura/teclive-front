"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Empty, Modal, Pill, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { MODELOS_KEY, TEMPLATE_TYPES, adminApi, type Template } from "@/lib/contratos";

function Templates() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [inactive, setInactive] = useState(false);
  const [rows, setRows] = useState<Template[] | null>(null);
  const [edit, setEdit] = useState<Template | "new" | null>(null);
  const [text, setText] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => adminApi.templates(term, inactive).then(setRows).catch(() => setRows([])), [term, inactive]);
  useEffect(() => { void load(); }, [load]);

  const open = (t: Template | "new") => { setEdit(t); setText(t === "new" ? "" : t.description); setType(t === "new" ? "" : String(t.type)); setError(""); };
  async function save() {
    setError("");
    try { await adminApi.saveTemplate(edit === "new" || !edit ? null : edit.id, { description: text, type: type === "" ? -1 : Number(type) }); setEdit(null); void load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Modelos de Contrato" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Modelos de Contrato</h1>
        <button type="button" onClick={() => open("new")} className={btnPrimary}>Novo Modelo</button>
      </header>
      <form onSubmit={(e) => { e.preventDefault(); setTerm(q); }} className={`${card} mb-4 flex flex-wrap items-center gap-3 p-3`}>
        <div className="relative min-w-[200px] flex-1"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ds-text-secondary" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar..." className={`${field} pl-10`} /></div>
        <label className="flex items-center gap-2 text-sm text-ds-text-muted"><input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} className="h-4 w-4 accent-[#005CD2]" />Exibir inativos</label>
        <button type="submit" className={btnPrimary}>Pesquisar</button>
      </form>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th className="px-5 py-3 font-bold">Descrição</th><th className="px-3 py-3 font-bold">Tipo Modelo</th><th className="px-3 py-3 text-center font-bold">Status</th><th className="px-5 py-3 text-center font-bold">Ações</th></tr></thead>
          <tbody>
            {!rows || rows.length === 0 ? <Empty cols={4} loading={!rows} text="Nenhum registro encontrado." /> : rows.map((t) => (
              <tr key={t.id} className="border-t border-ds-border-subtle hover:bg-ds-bg/50">
                <td className="px-5 py-3 font-semibold text-ds-primary-deep">{t.description}</td><td className="px-3 py-3 text-ds-text-muted">{TEMPLATE_TYPES[t.type]}</td>
                <td className="px-3 py-3 text-center"><Pill ok={t.isActive} /></td>
                <td className="px-5 py-3 text-center"><button type="button" aria-label="Editar modelo" onClick={() => open(t)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-primary hover:border-ds-primary"><Icon name="edit_square" className="text-[18px]" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit === "new" ? "Novo Modelo" : "Editar Modelo"} onClose={() => setEdit(null)}>
          <p className="mb-4 text-xs text-ds-text-secondary">Modelos de Contrato são padrões customizáveis que otimizam a criação de documentos para formalização dos contratos.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Descrição *</span><input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Insira a descrição do modelo" className={field} maxLength={200} /></label>
            <label><span className={label}>Tipo *</span><select value={type} onChange={(e) => setType(e.target.value)} className={field}><option value="">Selecione...</option>{TEMPLATE_TYPES.map((t, i) => <option key={t} value={i}>{t}</option>)}</select></label>
          </div>
          {edit !== "new" && <label className="mt-3 flex items-center gap-2 text-sm text-ds-text-muted"><input type="checkbox" checked={edit.isActive} onChange={(e) => { const v = e.target.checked; void adminApi.saveTemplate(edit.id, { isActive: v }).then((t) => { setEdit(t); void load(); }); }} className="h-4 w-4 accent-[#005CD2]" />Modelo ativo</label>}
          {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
          <div className="mt-5 flex gap-2"><button type="button" onClick={() => void save()} className={btnPrimary}>Salvar Modelo</button><button type="button" onClick={() => setEdit(null)} className={btnGhost}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}

export default function TemplatesPage() { return <PageShell permissionKey={MODELOS_KEY}>{() => <Templates />}</PageShell>; }
