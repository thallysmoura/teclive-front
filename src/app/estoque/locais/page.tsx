"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listStockLocations, renameStockLocation, type StockLocation } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { LocationForm } from "@/components/stock/location-form";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { LocationActionsModal, useLocationActions } from "@/components/stock/location-actions";
import { SortButton } from "@/components/ui/sortable";

const KEY = "item_b2681b6f-1f50-4d5b-b28a-98b27905e6ad";

type Menu = { location: StockLocation; top: number; right: number } | null;

export default function StockLocationsPage() {
  const [rows, setRows] = useState<StockLocation[]>([]);
  const [busca, setBusca] = useState("");
  const [exibirInativos, setExibirInativos] = useState(false);
  const [orderBy, setOrderBy] = useState<"isPrincipal" | "description" | "isActive">("isPrincipal");
  const [desc, setDesc] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [menu, setMenu] = useState<Menu>(null);
  const [editing, setEditing] = useState<StockLocation | null>(null);

  const load = useCallback(() => {
    setCarregando(true);
    return listStockLocations({ descricao: busca, exibirInativos, ordenarPor: orderBy, decrescente: desc })
      .then((r) => setRows(r.lista))
      .finally(() => setCarregando(false));
  }, [busca, exibirInativos, orderBy, desc]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const actions = useLocationActions({ onChanged: load });

  function sortBy(column: "description" | "isActive") {
    if (orderBy === column) setDesc((d) => !d);
    else { setOrderBy(column); setDesc(false); }
  }
  const arrow = (c: string) => (orderBy === c ? (desc ? " ↓" : " ↑") : "");

  function openMenu(e: React.MouseEvent<HTMLButtonElement>, location: StockLocation) {
    if (menu?.location.id === location.id) return setMenu(null);
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ location, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

  function choose(action: Parameters<typeof actions.run>[1]) {
    if (menu) actions.run(menu.location, action);
    setMenu(null);
  }

  return (
    <PageShell permissionKey={KEY}>
      {() => (
        <div onClick={() => menu && setMenu(null)}>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Locais de Estoque" }]} />
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ds-primary-deep">Locais de Estoque</h1>
            <Link href="/estoque/locais/novo" className="btn-add inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold text-white transition-all hover:-translate-y-px">
              <Icon name="add" className="text-[18px]" /> Novo Local
            </Link>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-ds-border-subtle bg-white p-4">
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" />
              <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquise pela descrição..." className="pl-10" />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ds-text-muted">
              <input type="checkbox" role="switch" checked={exibirInativos} onChange={(e) => setExibirInativos(e.target.checked)} className="h-4 w-4 accent-ds-primary" />
              Exibir inativos
            </label>
          </div>

          {actions.error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{actions.error}</p>}

          <div className={`ds-table-wrap ${carregando ? "opacity-60" : ""}`}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th><SortButton label="Descrição" active={orderBy === "description"} desc={desc} onClick={() => sortBy("description")} /></th>
                  <th><SortButton label="Status" active={orderBy === "isActive"} desc={desc} onClick={() => sortBy("isActive")} /></th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Descrição" className="ds-strong">
                      <Link href={`/estoque/locais/${row.id}`} className="hover:underline">{row.description}</Link>
                      {row.isPrincipal && <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-ds-primary-deep px-2 py-0.5 text-[11px] font-bold text-white"><Icon name="star" className="text-[12px]" />Estoque Principal</span>}
                    </td>
                    <td data-label="Status">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.isActive ? "bg-ds-success/10 text-ds-success" : "bg-ds-border-subtle text-ds-text-secondary"}`}>{row.isActive ? "Ativo" : "Inativo"}</span>
                    </td>
                    <td data-label="Ações">
                      <span className="flex items-center justify-end gap-2 md:justify-center">
                        <button type="button" onClick={() => setEditing(row)} className="inline-flex items-center gap-1 rounded-md border border-ds-primary-deep px-2.5 py-1 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="edit" className="text-[14px]" />Editar</button>
                        <button type="button" aria-haspopup="menu" aria-expanded={menu?.location.id === row.id} onClick={(e) => { e.stopPropagation(); openMenu(e, row); }} className="inline-flex items-center gap-1 rounded-md border border-ds-primary-deep px-2.5 py-1 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white">Opções<Icon name="arrow_drop_down" className="text-[16px]" /></button>
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !carregando && <tr><td colSpan={3} className="text-center">Nenhum local de estoque encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-ds-text-secondary">{rows.length === 0 ? "0 registros" : `1 a ${rows.length} de ${rows.length} registros`}</p>

          {menu && (
            <ul role="menu" style={{ top: menu.top, right: menu.right }} className="fixed z-40 w-52 overflow-hidden rounded-lg border border-ds-border-subtle bg-white py-1 text-sm shadow-xl">
              {!menu.location.isPrincipal && menu.location.isActive && <li><button role="menuitem" type="button" onClick={() => choose("principal")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-ds-primary-deep hover:bg-ds-bg"><Icon name="star" className="text-[16px]" />Definir como principal</button></li>}
              {!menu.location.isPrincipal && <li><button role="menuitem" type="button" onClick={() => choose(menu.location.isActive ? "inactivate" : "activate")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-ds-danger-text hover:bg-ds-bg"><Icon name={menu.location.isActive ? "block" : "check_circle"} className="text-[16px]" />{menu.location.isActive ? "Inativar" : "Ativar"}</button></li>}
              {!menu.location.isPrincipal && <li><button role="menuitem" type="button" onClick={() => choose("delete")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-ds-danger-text hover:bg-ds-bg"><Icon name="delete" className="text-[16px]" />Excluir</button></li>}
              {menu.location.isPrincipal && <li className="px-3 py-2 text-xs text-ds-text-secondary">O estoque principal não pode ser inativado nem excluído.</li>}
            </ul>
          )}
          <Modal open={!!editing} onClose={() => setEditing(null)} wide labelledBy="location-edit-title">
            <h2 id="location-edit-title" className="mb-4 text-lg font-bold text-ds-primary-deep">Editando Local de Estoque</h2>
            {editing && (
              <LocationForm
                embedded key={editing.id} title="Editando Local de Estoque" initial={editing.description} submitLabel="Salvar Alteração" backHref="/estoque/locais" backLabel="voltar à listagem"
                onCancel={() => setEditing(null)} onSubmit={async (description) => { await renameStockLocation(editing.id, description); setEditing(null); await load(); }}
              />
            )}
          </Modal>
          <LocationActionsModal controller={actions} />
        </div>
      )}
    </PageShell>
  );
}
