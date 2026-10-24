"use client";

import { Suspense, use, useEffect, useState } from "react";
import { SortButton, useSort } from "@/components/ui/sortable";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getStockMovement, type StockMovementDetail } from "@/lib/api";
import { formatMoney, formatMovementDate, formatQty, MOVEMENT_ORIGINS, MOVEMENTS_PERMISSION_KEY } from "@/lib/stock";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";

function Details({ id }: { id: string }) {
  const router = useRouter();
  const print = useSearchParams().get("imprimir") === "1";
  const [movement, setMovement] = useState<StockMovementDetail | null | undefined>(undefined);

  useEffect(() => { getStockMovement(id).then(setMovement).catch(() => setMovement(null)); }, [id]);
  const sort = useSort(movement?.items ?? [], { description: (i) => i.description, type: (i) => i.type, quantity: (i) => Number(i.quantity), cost: (i) => Number(i.cost), location: (i) => i.locationName });
  useEffect(() => {
    if (print && movement) { const t = setTimeout(() => window.print(), 300); return () => clearTimeout(t); }
  }, [print, movement]);

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Movimentos de Estoque", href: "/estoque/movimentos" }, { label: "Detalhes do Movimento de Estoque" }]} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-bold text-ds-primary-deep">Detalhes do Movimento de Estoque</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => router.push("/estoque/movimentos")} className="inline-flex items-center gap-2 rounded-lg border border-ds-primary-deep px-3 py-1.5 text-sm font-semibold text-ds-primary-deep hover:bg-ds-bg"><Icon name="arrow_back" className="text-[16px]" />Voltar</button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-ds-primary-deep px-3 py-1.5 text-sm font-semibold text-ds-primary-deep hover:bg-ds-bg"><Icon name="print" className="text-[16px]" />Imprimir</button>
        </div>
      </div>
      {movement === null ? <p className="text-sm text-ds-text-secondary">Movimento não encontrado. <Link href="/estoque/movimentos" className="text-ds-primary">Voltar à listagem</Link></p> : movement && (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <aside className="self-start rounded-xl border border-ds-border-subtle bg-white p-5">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-ds-border-subtle bg-ds-bg text-ds-text-secondary"><Icon name="local_shipping" className="!text-[36px]" /></div>
            <h2 className="text-center text-base font-bold text-ds-text">{movement.description}</h2>
            <p className="mb-4 text-center text-xs text-ds-text-secondary">{MOVEMENT_ORIGINS[movement.operation] ?? `Operação ${movement.operation}`}</p>
            <h3 className="mb-2 border-b border-ds-border-subtle pb-1 text-sm font-semibold text-ds-primary-deep">Dados Básicos</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-ds-text-secondary">Usuário</dt><dd className="font-medium text-ds-text">{movement.userName}</dd></div>
              <div><dt className="text-xs text-ds-text-secondary">Data da Operação</dt><dd className="font-medium text-ds-text">{formatMovementDate(movement.createdAt)}</dd></div>
              <div><dt className="text-xs text-ds-text-secondary">Data do Movimento</dt><dd className="font-medium text-ds-text">{formatMovementDate(movement.movementDate)}</dd></div>
              {movement.cancellationDate && <div><dt className="text-xs text-ds-text-secondary">Cancelado em</dt><dd className="font-medium text-ds-danger-text">{formatMovementDate(movement.cancellationDate)}</dd></div>}
            </dl>
          </aside>

          <section className="rounded-xl border border-ds-border-subtle bg-white p-5">
            <h2 className="mb-3 text-base font-semibold text-ds-primary-deep">Itens do Movimento <span className="font-normal text-ds-text-secondary">({movement.items.length})</span></h2>
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead><tr><th aria-sort={sort.ariaSort("description")}><SortButton {...sort.header("description", "Descrição")} /></th><th aria-sort={sort.ariaSort("type")}><SortButton {...sort.header("type", "Tipo")} /></th><th className="text-right" aria-sort={sort.ariaSort("quantity")}><SortButton {...sort.header("quantity", "Quant.")} /></th><th className="text-right" aria-sort={sort.ariaSort("cost")}><SortButton {...sort.header("cost", "Custo")} /></th><th aria-sort={sort.ariaSort("location")}><SortButton {...sort.header("location", "Estoque")} /></th></tr></thead>
                <tbody>
                  {sort.sorted.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Descrição">{item.description}</td>
                      <td data-label="Tipo"><span className={`inline-flex items-center gap-1 font-medium ${item.type === "IN" ? "text-ds-success" : "text-ds-danger-text"}`}><Icon name={item.type === "IN" ? "arrow_upward" : "arrow_downward"} className="text-[14px]" />{item.type === "IN" ? "Entrada" : "Saída"}</span></td>
                      <td data-label="Quant." className="whitespace-nowrap md:text-right">{formatQty(item.quantity)} {item.unit}</td>
                      <td data-label="Custo" className="whitespace-nowrap md:text-right">{formatMoney(item.cost)}</td>
                      <td data-label="Estoque">{item.locationName}</td>
                    </tr>
                  ))}
                  {movement.items.length === 0 && <tr><td colSpan={5} className="text-center">Os itens deste movimento não foram importados.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default function StockMovementDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <PageShell permissionKey={MOVEMENTS_PERMISSION_KEY}>
      {() => <Suspense fallback={null}><Details id={id} /></Suspense>}
    </PageShell>
  );
}
