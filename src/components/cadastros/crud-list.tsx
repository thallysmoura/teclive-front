"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ListParams, Page } from "@/lib/cadastros";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SortButton } from "@/components/ui/sortable";

export type Column<T> = { label: string; sortKey?: string; render: (row: T) => ReactNode; className?: string; strong?: boolean };

type Entity = { id: string; isActive: boolean };

export type Filters = { type: string; role: string; inactive: boolean };
const NO_FILTERS: Filters = { type: "", role: "", inactive: false };

type Props<T extends Entity> = {
  permissionKey: string;
  title: string;
  breadcrumb: string;
  /** Grupo do menu mostrado no caminho de navegação (padrão: Administrativo). */
  group?: string;
  basePath: string;
  newLabel: string;
  searchPlaceholder: string;
  entityLabel: string;
  columns: Column<T>[];
  defaultSort: string;
  api: {
    list: (params: ListParams) => Promise<Page<T>>;
    get: (id: string) => Promise<T | null>;
    setActive: (id: string, active: boolean) => Promise<unknown>;
    remove: (id: string) => Promise<void>;
  };
  rowName: (row: T) => string;
  /** Painel de filtros (botão de funil + "Aplicar Filtros"); quando presente, substitui o checkbox "Exibir inativos". */
  header?: ReactNode;
  /** Botões extras ao lado do "Novo ..." (ex.: Variáveis). */
  headerActions?: ReactNode;
  /** "Novo" abre um modal em vez de uma tela própria. */
  creator?: { title: string; wide?: boolean; render: (ctx: { onSaved: () => void; onCancel: () => void }) => ReactNode };
  /** Filtro por período (De / Até) ao lado da busca. */
  dateRange?: boolean;
  /** Itens extras no menu Opções de cada linha. */
  extraMenu?: { label: string; icon: string; show?: (row: T) => boolean; onClick: (row: T, reload: () => Promise<unknown>) => void | Promise<void> }[];
  /** Esconde "Inativar/Ativar" (cadastros sem status). */
  hideInactivate?: boolean;
  /** Esconde o "Exibir inativos". */
  hideInactiveToggle?: boolean;
  /** Edição em modal: recebe o registro carregado e fecha/recarrega via callbacks. */
  editor?: { title: string; wide?: boolean; render: (ctx: { item: T; onSaved: () => void; onCancel: () => void }) => ReactNode };
  filterPanel?: { inactiveLabel?: string; contractToggle?: boolean; render: (draft: Filters, set: (patch: Partial<Filters>) => void) => ReactNode };
};

type Pending = { row: Entity; name: string; action: "inactivate" | "activate" | "delete" } | null;

export function CrudList<T extends Entity>(props: Props<T>) {
  const { columns, api, basePath } = props;
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [draft, setDraft] = useState<Filters>(NO_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [orderBy, setOrderBy] = useState(props.defaultSort);
  const [desc, setDesc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState<{ row: T; top: number; right: number } | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [editing, setEditing] = useState<{ id: string; item: T | null | undefined } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return api.list({ q, exibirInativos: props.filterPanel ? filters.inactive : showInactive, page, orderBy, desc, role: filters.role, type: filters.type, from, until })
      .then((r) => { setRows(r.lista); setTotal(r.totalRegistros); setPageSize(r.tamanhoPagina); })
      .catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar a listagem."))
      .finally(() => setLoading(false));
  }, [api, q, showInactive, page, orderBy, desc, filters, props.filterPanel, from, until]);

  useEffect(() => { load(); }, [load]);
  // Filtra enquanto digita (sem precisar clicar no botão).
  useEffect(() => {
    const timer = setTimeout(() => { const next = text.trim(); setQ((current) => { if (current === next) return current; setPage(1); return next; }); }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  function sortBy(key: string) {
    if (orderBy === key) setDesc((d) => !d); else { setOrderBy(key); setDesc(false); }
    setPage(1);
  }
  const arrow = (key?: string) => (key && orderBy === key ? (desc ? " ↓" : " ↑") : "");

  async function confirm() {
    if (!pending) return;
    setBusy(true); setError("");
    try {
      if (pending.action === "delete") await api.remove(pending.row.id);
      else await api.setActive(pending.row.id, pending.action === "activate");
      setPending(null);
      await load();
    } catch (e) {
      setPending(null);
      setError(e instanceof Error ? e.message : "Não foi possível concluir a operação.");
    } finally { setBusy(false); }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2);
  const verb = { inactivate: "Inativar", activate: "Ativar", delete: "Excluir" };

  return (
    <PageShell permissionKey={props.permissionKey}>
      {() => (
        <div onClick={() => menu && setMenu(null)}>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: props.group ?? "Administrativo" }, { label: props.breadcrumb }]} />
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ds-primary-deep">{props.title}</h1>
            <span className="flex flex-wrap items-center gap-2">
              {props.headerActions}
              {props.creator ? (
                <button type="button" onClick={() => setCreating(true)} className="btn-add inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold text-white transition-all hover:-translate-y-px"><Icon name="add" className="text-[18px]" /> {props.newLabel}</button>
              ) : (
                <Link href={`${basePath}/novo`} className="btn-add inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold text-white transition-all hover:-translate-y-px"><Icon name="add" className="text-[18px]" /> {props.newLabel}</Link>
              )}
            </span>
          </div>

          {props.header}

          <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(text.trim()); }} className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-ds-border-subtle bg-white p-4">
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={props.searchPlaceholder} className="pr-12" />
              <button type="submit" aria-label="Pesquisar" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-[10px] bg-ds-primary-deep text-white"><Icon name="search" className="text-[18px]" /></button>
            </div>
            {props.dateRange && (
              <div className="flex items-center gap-2">
                <Input type="date" aria-label="De" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
                <span className="text-xs text-ds-text-secondary">até</span>
                <Input type="date" aria-label="Até" value={until} onChange={(e) => { setUntil(e.target.value); setPage(1); }} className="w-40" />
              </div>
            )}
            {props.filterPanel ? (
              <div className="relative">
                <button type="button" aria-label="Filtros" aria-expanded={panelOpen} title="Filtros" onClick={() => { setDraft(filters); setPanelOpen((o) => !o); }} className="flex h-11 w-12 items-center justify-center gap-0.5 rounded-[10px] bg-ds-primary-deep text-white"><Icon name="filter_alt" className="text-[18px]" /><Icon name="arrow_drop_down" className="text-[16px]" /></button>
                {panelOpen && (
                  <div className="absolute left-0 top-12 z-30 w-72 rounded-xl border border-ds-border-subtle bg-white p-4 shadow-xl">
                    {props.filterPanel.render(draft, (patch) => setDraft((d) => ({ ...d, ...patch })))}
                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ds-text"><input type="checkbox" checked={draft.inactive} onChange={(e) => setDraft((d) => ({ ...d, inactive: e.target.checked }))} className="h-4 w-4 accent-ds-primary" />{props.filterPanel.inactiveLabel ?? "Exibir inativos"}</label>
                    {props.filterPanel.contractToggle && <label className="mt-2 flex items-center gap-2 text-sm text-ds-text-secondary" title="Disponível quando o módulo de Contratos for implementado"><input type="checkbox" disabled className="h-4 w-4" />Somente pessoas com contrato</label>}
                    <button type="button" onClick={() => { setFilters(draft); setPage(1); setPanelOpen(false); }} className="mt-4 h-11 w-full rounded-[10px] bg-ds-primary text-sm font-bold text-white hover:bg-ds-primary-hover">Aplicar Filtros</button>
                  </div>
                )}
              </div>
            ) : props.hideInactiveToggle ? null : (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ds-text-muted">
                <input type="checkbox" checked={showInactive} onChange={(e) => { setShowInactive(e.target.checked); setPage(1); }} className="h-4 w-4 accent-ds-primary" />
                Exibir inativos
              </label>
            )}
          </form>

          {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}

          <div className={`ds-table-wrap ${loading ? "opacity-60" : ""}`}>
            <table className="ds-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.label} className={c.className}>{c.sortKey ? <SortButton label={c.label} active={orderBy === c.sortKey} desc={desc} onClick={() => sortBy(c.sortKey!)} /> : c.label}</th>
                  ))}
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c) => <td key={c.label} data-label={c.label} className={`${c.strong ? "ds-strong" : ""} ${c.className ?? ""}`}>{c.render(row)}</td>)}
                    <td data-label="Ações">
                      <span className="flex items-center justify-end gap-2 md:justify-center">
                        {props.editor ? <button type="button" onClick={() => { setEditing({ id: row.id, item: undefined }); api.get(row.id).then((item) => setEditing({ id: row.id, item })).catch(() => setEditing({ id: row.id, item: null })); }} className="inline-flex items-center gap-1 rounded-md border border-ds-primary-deep px-2.5 py-1 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="edit" className="text-[14px]" />Editar</button> : <Link href={`${basePath}/${row.id}`} className="inline-flex items-center gap-1 rounded-md border border-ds-primary-deep px-2.5 py-1 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="edit" className="text-[14px]" />Editar</Link>}
                        <button type="button" aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); if (menu?.row.id === row.id) return setMenu(null); const rect = e.currentTarget.getBoundingClientRect(); setMenu({ row, top: rect.bottom + 4, right: window.innerWidth - rect.right }); }} className="inline-flex items-center gap-1 rounded-md border border-ds-primary-deep px-2.5 py-1 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white">Opções<Icon name="arrow_drop_down" className="text-[16px]" /></button>
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && <tr><td colSpan={columns.length + 1} className="text-center">Nenhum registro encontrado.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-ds-text-secondary">
            <span>{first} a {last} de {total} registros</span>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior" className="h-9 w-9 rounded-lg border border-ds-border bg-white disabled:opacity-40"><Icon name="chevron_left" /></button>
              {pages.map((p, i) => (
                <span key={p} className="flex items-center gap-1.5">
                  {i > 0 && p - pages[i - 1] > 1 && <span className="px-1">…</span>}
                  <button type="button" onClick={() => setPage(p)} className={`h-9 w-9 rounded-lg border text-sm font-semibold ${p === page ? "border-ds-primary-deep bg-ds-primary-deep text-white" : "border-ds-border bg-white"}`}>{p}</button>
                </span>
              ))}
              <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página" className="h-9 w-9 rounded-lg border border-ds-border bg-white disabled:opacity-40"><Icon name="chevron_right" /></button>
            </div>
          </div>

          {menu && (
            <ul role="menu" style={{ top: menu.top, right: menu.right }} className="fixed z-40 w-44 overflow-hidden rounded-lg border border-ds-border-subtle bg-white py-1 text-sm shadow-xl">
              {props.extraMenu?.filter((item) => !item.show || item.show(menu.row)).map((item) => (
                <li key={item.label}><button role="menuitem" type="button" onClick={() => { const row = menu.row; setMenu(null); void item.onClick(row, load); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-ds-primary-deep hover:bg-ds-bg"><Icon name={item.icon} className="text-[16px]" />{item.label}</button></li>
              ))}
              {!props.hideInactivate && <li><button role="menuitem" type="button" onClick={() => { setPending({ row: menu.row, name: props.rowName(menu.row), action: menu.row.isActive ? "inactivate" : "activate" }); setMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-ds-primary-deep hover:bg-ds-bg"><Icon name={menu.row.isActive ? "block" : "check_circle"} className="text-[16px]" />{menu.row.isActive ? "Inativar" : "Ativar"}</button></li>}
              <li><button role="menuitem" type="button" onClick={() => { setPending({ row: menu.row, name: props.rowName(menu.row), action: "delete" }); setMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-ds-danger-text hover:bg-ds-bg"><Icon name="delete" className="text-[16px]" />Excluir</button></li>
            </ul>
          )}

          {props.creator && (
            <Modal open={creating} onClose={() => setCreating(false)} wide={props.creator.wide} labelledBy="crud-create-title">
              <h2 id="crud-create-title" className="mb-4 text-lg font-bold text-ds-primary-deep">{props.creator.title}</h2>
              {creating && props.creator.render({ onSaved: () => { setCreating(false); setPage(1); load(); }, onCancel: () => setCreating(false) })}
            </Modal>
          )}

          {props.editor && (
            <Modal open={!!editing} onClose={() => setEditing(null)} wide={props.editor.wide} labelledBy="crud-edit-title">
              <h2 id="crud-edit-title" className="mb-4 text-lg font-bold text-ds-primary-deep">{props.editor.title}</h2>
              {editing?.item === undefined && <p className="py-8 text-center text-sm text-ds-text-secondary">Carregando...</p>}
              {editing?.item === null && <p className="py-8 text-center text-sm text-ds-text-secondary">Registro não encontrado.</p>}
              {editing?.item && props.editor.render({ item: editing.item, onSaved: () => { setEditing(null); load(); }, onCancel: () => setEditing(null) })}
            </Modal>
          )}

          <Modal open={!!pending} onClose={() => setPending(null)} labelledBy="crud-confirm-title">
            {pending && (
              <>
                <h2 id="crud-confirm-title" className="mb-2 text-lg font-bold text-ds-primary-deep">{verb[pending.action]} &quot;{pending.name}&quot;?</h2>
                <p className="mb-6 text-sm text-ds-text-muted">{pending.action === "delete" ? `Esta ação não pode ser desfeita. ${props.entityLabel} em uso não pode ser excluído; nesse caso, inative-o.` : pending.action === "inactivate" ? "O registro deixará de aparecer nas listagens e seleções, mas o histórico é mantido." : "O registro voltará a ser exibido normalmente."}</p>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setPending(null)}>Cancelar</Button>
                  <Button type="button" variant={pending.action === "activate" ? "primary" : "danger"} onClick={confirm} disabled={busy}>{busy ? "Aguarde..." : verb[pending.action]}</Button>
                </div>
              </>
            )}
          </Modal>
        </div>
      )}
    </PageShell>
  );
}

export const activeBadge = (active: boolean) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-ds-success/10 text-ds-success" : "bg-ds-border-subtle text-ds-text-secondary"}`}>{active ? "Ativo" : "Inativo"}</span>
);
