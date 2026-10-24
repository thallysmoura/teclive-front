"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMe, getStockProductDetail, getStockProductFilters, listStockProducts, logout,
  type Me, type StockProductBalance, type StockProductDetail,
} from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { AwaitingPermission } from "@/components/layout/awaiting-permission";
import { FullScreenSpinner } from "@/components/ui/spinner";
import { FieldLabel, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SortButton } from "@/components/ui/sortable";
import { Icon } from "@/components/ui/icon";

const PERMISSION_KEY = "item_1661e6d3-c123-4b5b-9239-36f2d7b283fb";
const PAGE_SIZE = 50;
const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";

export default function StockBalanceQueryPage() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StockProductBalance[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<"description" | "balance">("description");
  const [desc, setDesc] = useState(false);
  const [busca, setBusca] = useState("");
  const [applied, setApplied] = useState({ search: "", brand: "", group: "" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [group, setGroup] = useState("");
  const [options, setOptions] = useState<{ brands: string[]; groups: string[] }>({ brands: [], groups: [] });
  const [detail, setDetail] = useState<StockProductDetail | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    getMe().then((me) => {
      if (!me) return router.replace("/login");
      setUser(me);
      setLoading(false);
    });
  }, [router]);

  const hasAccess = !!user && (user.role === "ADMIN" || user.permissions.includes(PERMISSION_KEY));

  const query = useCallback(
    (p: number) => listStockProducts({ ...applied, page: p, orderBy, desc }),
    [applied, orderBy, desc],
  );

  useEffect(() => {
    if (!hasAccess) return;
    let active = true;
    setFetching(true);
    query(page).then((r) => { if (active) { setRows(r.lista); setTotal(r.totalRegistros); } }).finally(() => active && setFetching(false));
    return () => { active = false; };
  }, [hasAccess, query, page]);

  useEffect(() => {
    if (hasAccess) getStockProductFilters().then(setOptions);
  }, [hasAccess]);

  function consult() {
    setPage(1);
    setApplied({ search: busca.trim(), brand, group });
  }

  function sortBy(column: "description" | "balance") {
    if (orderBy === column) setDesc((d) => !d);
    else { setOrderBy(column); setDesc(false); }
    setPage(1);
  }

  async function exportCsv() {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const all: StockProductBalance[] = [];
    for (let p = 1; p <= pages; p++) all.push(...(await query(p)).lista);
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ["Produto;Marca;Grupo do Produto;Saldo;Unidade", ...all.map((r) => [esc(r.description), esc(r.brand), esc(r.productGroup), fmt(r.balance), r.unit].join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "consulta-saldo-estoque.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !user) return <FullScreenSpinner />;

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const arrow = (c: string) => (orderBy === c ? (desc ? " ↓" : " ↑") : "");

  return (
    <div className="flex min-h-screen bg-ds-bg">
      <Sidebar user={user} onLogout={async () => { await logout(); router.replace("/login"); }} />
      {!hasAccess ? <AwaitingPermission user={user} /> : (
        <main className="min-w-0 flex-1 px-4 pb-10 pt-20 md:px-8 md:pt-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ds-primary-deep">Consulta de Saldo por Estoque</h1>
              <p className="text-sm text-ds-text-secondary">Saldo atual dos produtos em cada local de estoque.</p>
            </div>
            <Button type="button" variant="secondary" onClick={exportCsv} className="inline-flex items-center gap-2">
              <Icon name="download" className="text-[18px]" /> Exportar
            </Button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); consult(); }} className="mb-3 rounded-xl border border-ds-border-subtle bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" />
                <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquise pela descrição do produto, código do produto ..." className="pl-10" />
              </div>
              <Button type="submit">Consultar</Button>
              <button type="button" onClick={() => setFiltersOpen((o) => !o)} className="inline-flex items-center gap-1 text-sm font-semibold text-ds-primary-deep hover:text-ds-primary">
                <Icon name="filter_alt" className="text-[18px]" /> Filtros avançados
              </button>
            </div>
            {filtersOpen && (
              <div className="mt-4 grid gap-3 border-t border-ds-border-subtle pt-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5"><FieldLabel>Marca</FieldLabel>
                  <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectClass}>
                    <option value="">Todas</option>{options.brands.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5"><FieldLabel>Grupo do Produto</FieldLabel>
                  <select value={group} onChange={(e) => setGroup(e.target.value)} className={selectClass}>
                    <option value="">Todos</option>{options.groups.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </label>
              </div>
            )}
          </form>

          <p className="mb-2 text-right text-xs font-semibold text-ds-text-secondary">{total} produto(s) encontrado(s)</p>

          <div className={`ds-table-wrap ${fetching ? "opacity-60" : ""}`}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th><SortButton label="Produto" active={orderBy === "description"} desc={desc} onClick={() => sortBy("description")} /></th>
                  <th className="text-right"><SortButton label="Saldo" active={orderBy === "balance"} desc={desc} onClick={() => sortBy("balance")} /></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Produto">
                      <span className="block font-semibold">{r.description}</span>
                      <span className="text-xs font-normal text-ds-text-secondary">Marca: {r.brand} · Grupo do Produto: {r.productGroup}</span>
                    </td>
                    <td data-label="Saldo" className="md:text-right">
                      <span className="block font-semibold">{fmt(r.balance)} {r.unit}</span>
                      <button type="button" onClick={() => getStockProductDetail(r.id).then(setDetail)} className="text-xs font-semibold text-ds-primary hover:underline">« Detalhes</button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !fetching && <tr><td colSpan={2} className="text-center">Nenhum produto encontrado.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-ds-text-secondary">
            <span>{from} a {to} de {total} registros</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-ds-border bg-white px-3 py-1.5 disabled:opacity-40">Anterior</button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" onClick={() => setPage(p)} className={`h-9 w-9 rounded-lg border text-sm font-semibold ${p === page ? "border-ds-primary-deep bg-ds-primary-deep text-white" : "border-ds-border bg-white"}`}>{p}</button>
              ))}
              <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-ds-border bg-white px-3 py-1.5 disabled:opacity-40">Próxima</button>
            </div>
          </div>

          {detail && (
            <div className="fixed inset-0 z-50 flex justify-end bg-[#10202e]/50" onClick={() => setDetail(null)}>
              <aside onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && setDetail(null)} role="dialog" aria-modal="true" className="h-dvh w-full max-w-md overflow-y-auto bg-white shadow-2xl">
                <div className="flex items-center justify-between bg-ds-primary-deep px-5 py-4 text-white">
                  <h2 className="truncate pr-3 text-sm font-bold">Saldo por local de estoque &apos;{detail.description}&apos;</h2>
                  <button type="button" onClick={() => setDetail(null)} aria-label="Fechar" className="shrink-0"><Icon name="close" /></button>
                </div>
                <div className="p-5">
                  <h3 className="mb-3 border-b border-ds-border-subtle pb-2 text-base font-semibold text-ds-primary-deep">Dados do Produto</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div><dt className="text-xs text-ds-text-secondary">Produto:</dt><dd className="font-medium text-ds-text">{detail.description}</dd></div>
                    <div><dt className="text-xs text-ds-text-secondary">Unidade de medida:</dt><dd className="font-medium text-ds-text">{detail.unit}{detail.unitName ? ` - ${detail.unitName}` : ""}</dd></div>
                    <div><dt className="text-xs text-ds-text-secondary">Marca:</dt><dd className="font-medium text-ds-text">{detail.brand}</dd></div>
                    <div><dt className="text-xs text-ds-text-secondary">Grupo de Produto:</dt><dd className="font-medium text-ds-text">{detail.productGroup}</dd></div>
                  </dl>
                  <h3 className="mb-1 mt-6 border-b border-ds-border-subtle pb-2 text-base font-semibold text-ds-primary-deep">Local de estoque</h3>
                  <p className="mb-3 text-xs text-ds-text-secondary">Saldo por local de estoque.</p>
                  <div className="ds-table-wrap">
                    <table className="ds-table">
                      <thead><tr><th>Local de Estoque</th><th className="text-right">Saldo</th></tr></thead>
                      <tbody>
                        {detail.balances.map((b) => (
                          <tr key={b.location}><td data-label="Local de Estoque">{b.location}</td><td data-label="Saldo" className="md:text-right">{fmt(b.quantity)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4 flex justify-between px-2 text-sm text-ds-text-muted"><span>Saldo atual</span><strong className="text-ds-primary-deep">{fmt(detail.total)}</strong></p>
                </div>
              </aside>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
