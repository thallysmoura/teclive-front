"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createStockBalance, getMe, listStockBalances, listStockLocations, logout, type Me, type StockBalance, type StockLocation } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { AwaitingPermission } from "@/components/layout/awaiting-permission";
import { ShellLoading } from "@/components/layout/shell-loading";
import { FieldLabel, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SortButton, useSort } from "@/components/ui/sortable";
import { Icon } from "@/components/ui/icon";

const PERMISSION_KEY = "item_e76d29e7-1b58-44db-99ca-87bc4787eb6c";
const STATUS: Record<StockBalance["status"], { label: string; className: string }> = {
  OPEN: { label: "Em andamento", className: "bg-ds-warning/20 text-ds-warning-text" },
  COMPLETED: { label: "Finalizado", className: "bg-ds-success/10 text-ds-success" },
  CANCELLED: { label: "Cancelado", className: "bg-ds-danger-bg text-ds-danger-text" },
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";

export default function StockBalancesPage() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StockBalance[]>([]);
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 90 * 86400000)));
  const [until, setUntil] = useState(() => iso(new Date()));
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [filterType, setFilterType] = useState<"PRODUCTS" | "GROUPS">("PRODUCTS");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const sort = useSort(rows, { location: (r) => r.location.description, date: (r) => new Date(r.balanceDate).getTime(), user: (r) => r.userName, status: (r) => r.status });

  useEffect(() => {
    getMe().then((me) => {
      if (!me) return router.replace("/login");
      setUser(me);
      setLoading(false);
    });
  }, [router]);

  const hasAccess = !!user && (user.role === "ADMIN" || user.permissions.includes(PERMISSION_KEY));

  function load() {
    listStockBalances({ from, until }).then((r) => setRows(r.lista));
  }
  useEffect(() => {
    if (hasAccess) listStockBalances({ from, until }).then((r) => setRows(r.lista));
  }, [hasAccess, from, until]);

  function openModal() {
    setLocationId(""); setFilterType("PRODUCTS"); setError(""); setOpen(true);
    listStockLocations().then((r) => setLocations(r.lista));
  }

  async function confirm() {
    if (!locationId) return setError("Selecione o local de estoque.");
    setSaving(true); setError("");
    try {
      await createStockBalance({ locationId, filterType });
      setOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o balanço.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return <ShellLoading />;

  return (
    <div className="flex min-h-screen bg-ds-bg">
      <Sidebar user={user} onLogout={async () => { await logout(); router.replace("/login"); }} />
      {!hasAccess ? <AwaitingPermission user={user} /> : (
        <main className="min-w-0 flex-1 px-4 pb-10 pt-20 md:px-8 md:pt-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ds-primary-deep">Balanços de Estoque</h1>
              <p className="text-sm text-ds-text-secondary">Contagens e ajustes de estoque por local.</p>
            </div>
            <button type="button" onClick={openModal} className="btn-add inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold text-white transition-all hover:-translate-y-px"><Icon name="add" className="text-[18px]" /> Novo Balanço de Estoque</button>
          </div>

          <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-ds-border-subtle bg-white p-4">
            <label className="flex flex-col gap-1.5"><FieldLabel>De</FieldLabel><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="flex flex-col gap-1.5"><FieldLabel>Até</FieldLabel><Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
          </div>

          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead><tr><th aria-sort={sort.ariaSort("location")}><SortButton {...sort.header("location", "Estoque")} /></th><th aria-sort={sort.ariaSort("date")}><SortButton {...sort.header("date", "Data")} /></th><th aria-sort={sort.ariaSort("user")}><SortButton {...sort.header("user", "Usuário")} /></th><th aria-sort={sort.ariaSort("status")}><SortButton {...sort.header("status", "Status")} /></th><th>Ações</th></tr></thead>
              <tbody>
                {sort.sorted.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Estoque" className="ds-strong">{r.location.description}</td>
                    <td data-label="Data" className="whitespace-nowrap">{new Date(r.balanceDate).toLocaleDateString("pt-BR")}</td>
                    <td data-label="Usuário">{r.userName}</td>
                    <td data-label="Status"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[r.status].className}`}>{STATUS[r.status].label}</span></td>
                    <td data-label="Ações">—</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="text-center">Nenhum registro encontrado</td></tr>}
              </tbody>
            </table>
          </div>

          <Modal open={open} onClose={() => setOpen(false)} labelledBy="novo-balanco-title">
            <h2 id="novo-balanco-title" className="mb-4 text-lg font-bold text-ds-primary-deep">Novo Balanço de Estoque</h2>
            <h3 className="mb-2 text-base font-semibold text-ds-text-muted">Selecionar Estoque</h3>
            <label className="mb-5 flex flex-col gap-1.5">
              <FieldLabel>Local de Estoque <span className="text-ds-danger">*</span></FieldLabel>
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={selectClass}>
                <option value="">Selecione...</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.description}</option>)}
              </select>
            </label>

            <h3 className="mb-2 text-base font-semibold text-ds-text-muted">Filtrar Resultado</h3>
            <div className="mb-3 inline-flex overflow-hidden rounded-lg border border-ds-primary-deep">
              {([["PRODUCTS", "Produtos"], ["GROUPS", "Grupo de Produtos"]] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setFilterType(value)} className={`px-4 py-2 text-sm font-semibold ${filterType === value ? "bg-ds-primary-deep text-white" : "bg-white text-ds-primary-deep"}`}>{label}</button>
              ))}
            </div>
            {filterType === "PRODUCTS" ? (
              <label className="flex flex-col gap-1.5"><FieldLabel>Produtos</FieldLabel>
                <select className={selectClass} defaultValue=""><option value="">Todos os produtos</option></select>
              </label>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5"><FieldLabel>Grupos de Produto</FieldLabel>
                  <select className={selectClass} defaultValue=""><option value="">Todos os grupos</option></select>
                </label>
                <label className="flex flex-col gap-1.5"><FieldLabel>Tipo de Rastreabilidade</FieldLabel>
                  <select className={selectClass} defaultValue=""><option value="">Todas</option></select>
                </label>
              </div>
            )}

            {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
            <div className="mt-6 flex justify-center gap-3 border-t border-ds-border-subtle pt-4">
              <Button type="button" onClick={confirm} disabled={saving}>{saving ? "Salvando..." : "Confirmar"}</Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </Modal>
        </main>
      )}
    </div>
  );
}
