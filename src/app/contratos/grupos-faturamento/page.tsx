"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Empty, Modal, Pill, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { GRUPOS_KEY, adminApi, type Group } from "@/lib/contratos";

function Groups() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [inactive, setInactive] = useState(false);
  const [rows, setRows] = useState<Group[] | null>(null);
  const [edit, setEdit] = useState<Group | "new" | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => adminApi.groups(term, inactive).then(setRows).catch(() => setRows([])), [term, inactive]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    setError("");
    try { await adminApi.saveGroup(edit === "new" || !edit ? null : edit.id, { description: text }); setEdit(null); void load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); }
  }
  const open = (g: Group | "new") => { setEdit(g); setText(g === "new" ? "" : g.description); setError(""); };

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Grupos de Faturamentos" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Grupos de Faturamentos</h1>
        <button type="button" onClick={() => open("new")} className={btnPrimary}>Novo Grupo de Faturamento</button>
      </header>
      <form onSubmit={(e) => { e.preventDefault(); setTerm(q); }} className={`${card} mb-4 flex flex-wrap items-center gap-3 p-3`}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquise por descrição" className={`${field} min-w-[200px] flex-1`} />
        <label className="flex items-center gap-2 text-sm text-ds-text-muted"><input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} className="h-4 w-4 accent-[#005CD2]" />Exibir grupos inativos</label>
        <button type="submit" className={btnPrimary}>Pesquisar</button>
        <button type="button" onClick={() => { setQ(""); setTerm(""); setInactive(false); }} className={btnGhost}>Limpar</button>
      </form>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th className="px-5 py-3 font-bold">Descrição</th><th className="px-5 py-3 text-right font-bold">Status</th></tr></thead>
          <tbody>
            {!rows || rows.length === 0 ? <Empty cols={2} loading={!rows} text="Nenhum grupo encontrado." /> : rows.map((g) => (
              <tr key={g.id} className="cursor-pointer border-t border-ds-border-subtle hover:bg-ds-bg/50" onClick={() => open(g)}>
                <td className="px-5 py-3 font-semibold text-ds-primary-deep">{g.description}</td><td className="px-5 py-3 text-right"><Pill ok={g.isActive} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ds-text-secondary">{rows?.length ?? 0} {rows?.length === 1 ? "registro" : "registros"}</p>

      {edit && (
        <Modal title={edit === "new" ? "Novo Grupo de Faturamento" : "Editar Grupo de Faturamento"} onClose={() => setEdit(null)}>
          <label><span className={label}>Descrição *</span><input autoFocus value={text} onChange={(e) => setText(e.target.value)} className={field} maxLength={120} /></label>
          {edit !== "new" && <label className="mt-3 flex items-center gap-2 text-sm text-ds-text-muted"><input type="checkbox" checked={edit.isActive} onChange={(e) => { const v = e.target.checked; void adminApi.saveGroup(edit.id, { isActive: v }).then((g) => { setEdit(g); void load(); }); }} className="h-4 w-4 accent-[#005CD2]" />Grupo ativo</label>}
          {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
          <div className="mt-5 flex gap-2"><button type="button" onClick={() => void save()} className={btnPrimary}>Salvar</button><button type="button" onClick={() => setEdit(null)} className={btnGhost}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}

export default function GroupsPage() { return <PageShell permissionKey={GRUPOS_KEY}>{() => <Groups />}</PageShell>; }
