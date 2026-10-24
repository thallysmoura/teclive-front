"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listStockMovements, type StockMovement } from "@/lib/api";
import { formatMovementDate, MOVEMENTS_PERMISSION_KEY } from "@/lib/stock";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { SortButton } from "@/components/ui/sortable";

type Column = "movementDate" | "description" | "userName";

export default function StockMovementsPage() {
  const [rows, setRows] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [hideCancelled, setHideCancelled] = useState(false);
  const [orderBy, setOrderBy] = useState<Column>("movementDate");
  const [desc, setDesc] = useState(true);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return listStockMovements({ q, from, until, hideCancelled, page, orderBy, desc })
      .then((r) => { setRows(r.lista); setTotal(r.totalRegistros); setPageSize(r.tamanhoPagina); })
      .finally(() => setLoading(false));
  }, [q, from, until, hideCancelled, page, orderBy, desc]);

  useEffect(() => { load(); }, [load]);

  function sortBy(column: Column) {
    if (orderBy === column) setDesc((d) => !d);
    else { setOrderBy(column); setDesc(column === "movementDate"); }
    setPage(1);
  }
  const arrow = (c: Column) => (orderBy === c ? (desc ? " ↓" : " ↑") : "");

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2);

  return (
    <PageShell permissionKey={MOVEMENTS_PERMISSION_KEY}>
      {() => (
        <div onClick={() => menu && setMenu(null)}>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Movimentos de Estoque" }]} />
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ds-primary-deep">Movimentos de Estoque</h1>
            <Link href="/estoque/movimentos/novo" className="btn-add inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold text-white transition-all hover:-translate-y-px">
              <Icon name="add" className="text-[18px]" /> Novo Movimento
            </Link>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(text.trim()); }} className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-ds-border-subtle bg-white p-4">
            <label className="flex flex-col gap-1 text-xs font-semibold text-ds-text-secondary">De
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ds-text-secondary">Até
              <Input type="date" value={until} onChange={(e) => { setUntil(e.target.value); setPage(1); }} className="w-40" />
            </label>
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Pesquisar..." className="pr-12" />
              <button type="submit" aria-label="Pesquisar" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-[10px] bg-ds-primary-deep text-white"><Icon name="search" className="text-[18px]" /></button>
            </div>
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-ds-text-muted">
              <input type="checkbox" checked={hideCancelled} onChange={(e) => { setHideCancelled(e.target.checked); setPage(1); }} className="h-4 w-4 accent-ds-primary" />
              Ocultar movimentos cancelados
            </label>
          </form>

          <div className={`ds-table-wrap ${loading ? "opacity-60" : ""}`}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th><SortButton label="Descrição" active={orderBy === "description"} desc={desc} onClick={() => sortBy("description")} /></th>
                  <th><SortButton label="Data" active={orderBy === "movementDate"} desc={desc} onClick={() => sortBy("movementDate")} /></th>
                  <th><SortButton label="Usuário" active={orderBy === "userName"} desc={desc} onClick={() => sortBy("userName")} /></th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Descrição" className="ds-strong">
                      <Link href={`/estoque/movimentos/${r.id}`} className="hover:underline">{r.description}</Link>
                      {r.cancellationDate && <span className="ml-2 rounded-full bg-ds-danger-bg px-2 py-0.5 text-[11px] font-bold text-ds-danger-text">Cancelado</span>}
                    </td>
                    <td data-label="Data" className="whitespace-nowrap">{formatMovementDate(r.movementDate)}</td>
                    <td data-label="Usuário">{r.userName}</td>
                    <td data-label="Ações">
                      <span className="flex items-center justify-end gap-2 md:justify-center">
                        <Link href={`/estoque/movimentos/${r.id}`} aria-label="Ver detalhes" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-ds-primary-deep text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="edit_square" className="text-[16px]" /></Link>
                        <button type="button" aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); if (menu?.id === r.id) return setMenu(null); const rect = e.currentTarget.getBoundingClientRect(); setMenu({ id: r.id, top: rect.bottom + 4, right: window.innerWidth - rect.right }); }} className="inline-flex items-center gap-1 rounded-md border border-ds-primary-deep px-2.5 py-1 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white">Ações<Icon name="arrow_drop_down" className="text-[16px]" /></button>
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && <tr><td colSpan={4} className="text-center">Nenhum movimento encontrado.</td></tr>}
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
            <ul role="menu" style={{ top: menu.top, right: menu.right }} className="fixed z-40 w-40 overflow-hidden rounded-lg border border-ds-border-subtle bg-white py-1 text-sm shadow-xl">
              <li><Link role="menuitem" href={`/estoque/movimentos/${menu.id}?imprimir=1`} className="flex items-center gap-2 px-3 py-2 text-ds-primary-deep hover:bg-ds-bg"><Icon name="print" className="text-[16px]" />Imprimir</Link></li>
            </ul>
          )}
        </div>
      )}
    </PageShell>
  );
}
