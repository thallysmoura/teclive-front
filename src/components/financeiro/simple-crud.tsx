"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumb } from "@/components/layout/page-shell";
import { Empty, Modal, Pill, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";

type Row = { id: string; isActive: boolean; [k: string]: unknown };

/** Listagem com "exibir inativos", novo e editar em modal — usada por Formas de Pagamento, Centros de Resultado e Contas de Caixa. */
export function SimpleCrud<T extends Row>({ title, newLabel, nameField, load, save, extraCols, extraField }: {
  title: string; newLabel: string; nameField: keyof T & string; load: (inactive: boolean) => Promise<T[]>; save: (id: string | null, body: Record<string, unknown>) => Promise<unknown>;
  extraCols?: { head: string; cell: (r: T) => React.ReactNode }[]; extraField?: { key: string; label: string; options: string[]; initial: string };
}) {
  const [inactive, setInactive] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<T[] | null>(null);
  const [edit, setEdit] = useState<T | "new" | null>(null);
  const [text, setText] = useState("");
  const [extra, setExtra] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(() => load(inactive).then(setRows).catch(() => setRows([])), [load, inactive]);
  useEffect(() => { void refresh(); }, [refresh]);

  const open = (r: T | "new") => { setEdit(r); setError(""); setText(r === "new" ? "" : String(r[nameField])); setExtra(r === "new" ? extraField?.initial ?? "" : String(r[extraField?.key ?? ""] ?? "")); };
  async function submit() {
    setError("");
    try { await save(edit === "new" || !edit ? null : edit.id, { [nameField]: text, ...(extraField ? { [extraField.key]: extra } : {}) }); setEdit(null); void refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
  }
  const shown = (rows ?? []).filter((r) => String(r[nameField]).toLowerCase().includes(q.toLowerCase()));
  const cols = 3 + (extraCols?.length ?? 0);

  return (
    <div className="mx-auto max-w-[1000px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: title }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">{title}</h1><button type="button" onClick={() => open("new")} className={btnPrimary}>{newLabel}</button></header>
      <div className={`${card} mb-4 flex flex-wrap items-center gap-3 p-3`}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por descrição" className={`${field} min-w-[200px] flex-1`} /><label className="flex items-center gap-2 text-sm text-ds-text-muted"><input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} className="h-4 w-4 accent-[#005CD2]" />Exibir inativos</label></div>
      <div className={`${card} overflow-x-auto`}><table className="w-full text-left text-sm"><thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th className="px-5 py-3 font-bold">Descrição</th>{extraCols?.map((c) => <th key={c.head} className="px-3 py-3 font-bold">{c.head}</th>)}<th className="px-3 py-3 text-center font-bold">Status</th><th className="px-5 py-3 text-center font-bold">Ações</th></tr></thead>
        <tbody>{!rows || shown.length === 0 ? <Empty cols={cols} loading={!rows} text="Nenhum registro encontrado." /> : shown.map((r) => <tr key={r.id} className="border-t border-ds-border-subtle hover:bg-ds-bg/50"><td className="px-5 py-3 font-semibold text-ds-primary-deep">{String(r[nameField])}</td>{extraCols?.map((c) => <td key={c.head} className="px-3 py-3 text-ds-text-muted">{c.cell(r)}</td>)}<td className="px-3 py-3 text-center"><Pill ok={r.isActive} /></td><td className="px-5 py-3 text-center"><button type="button" onClick={() => open(r)} className="text-sm font-bold text-ds-primary hover:underline">Editar</button></td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-ds-text-secondary">{shown.length} registros</p>
      {edit && (
        <Modal title={edit === "new" ? newLabel : `Editar - ${title}`} onClose={() => setEdit(null)}>
          <label><span className={label}>Descrição *</span><input autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={160} className={field} /></label>
          {extraField && <label className="mt-3 block"><span className={label}>{extraField.label}</span><select value={extra} onChange={(e) => setExtra(e.target.value)} className={field}>{extraField.options.map((o) => <option key={o}>{o}</option>)}</select></label>}
          {edit !== "new" && <label className="mt-3 flex items-center gap-2 text-sm text-ds-text-muted"><input type="checkbox" checked={edit.isActive} onChange={(e) => { const v = e.target.checked; void save(edit.id, { isActive: v }).then(() => { setEdit({ ...edit, isActive: v }); void refresh(); }); }} className="h-4 w-4 accent-[#005CD2]" />Ativo</label>}
          {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
          <div className="mt-4 flex gap-2"><button type="button" onClick={() => void submit()} className={btnPrimary}>Salvar</button><button type="button" onClick={() => setEdit(null)} className={btnGhost}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}
