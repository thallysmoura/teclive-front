"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createStockMovement, listProductOptions, listStockLocations, type MovementItemInput, type ProductOption, type StockLocation } from "@/lib/api";
import { formatMoney, formatQty, MOVEMENTS_PERMISSION_KEY } from "@/lib/stock";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { SortButton, useSort } from "@/components/ui/sortable";

type Operation = MovementItemInput["operation"];
type Draft = MovementItemInput & { key: number };

const OPERATIONS: { value: Operation; label: string }[] = [{ value: "ADD", label: "Adicionar" }, { value: "REMOVE", label: "Retirar" }, { value: "TRANSFER", label: "Transferir" }];
const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";
const today = () => new Date().toISOString().slice(0, 10);
const toNumber = (value: string) => Number(value.replace(/\./g, "").replace(",", "."));

export default function NewStockMovementPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [items, setItems] = useState<Draft[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [operation, setOperation] = useState<Operation>("ADD");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    listProductOptions().then(setProducts).catch(() => {});
    listStockLocations().then((r) => setLocations(r.lista)).catch(() => {});
  }, []);

  const product = products.find((p) => p.id === productId);
  const principalId = locations.find((l) => l.isPrincipal)?.id ?? locations[0]?.id ?? "";
  const available = (locationId: string) => product?.balances.find((b) => b.locationId === locationId)?.quantity ?? 0;

  function openModal() {
    setOperation("ADD"); setProductId(""); setQuantity(""); setCost(""); setFromId(principalId); setToId(principalId); setModalError("");
    setOpen(true);
  }

  function chooseProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    setCost(p ? p.costPrice.toFixed(2).replace(".", ",") : "");
  }

  function confirmItem() {
    const qty = toNumber(quantity);
    const unitCost = toNumber(cost || "0");
    if (!product) return setModalError("Selecione o produto.");
    if (!(qty > 0)) return setModalError("Informe uma quantidade maior que zero.");
    if (!(unitCost >= 0)) return setModalError("Informe o custo.");
    if (operation !== "ADD" && !fromId) return setModalError("Selecione o estoque de saída.");
    if (operation !== "REMOVE" && !toId) return setModalError("Selecione o estoque de destino.");
    if (operation === "TRANSFER" && fromId === toId) return setModalError("Os estoques de saída e destino devem ser diferentes.");
    if (operation !== "ADD" && qty > available(fromId)) return setModalError(`Saldo insuficiente no estoque de saída (disponível: ${formatQty(available(fromId))} ${product.unit}).`);
    setItems((list) => [...list, { key: Date.now(), operation, productId: product.id, quantity: qty, cost: unitCost, fromLocationId: operation === "ADD" ? undefined : fromId, toLocationId: operation === "REMOVE" ? undefined : toId }]);
    setOpen(false);
  }

  async function save() {
    if (!description.trim()) return setError("Informe a descrição do movimento.");
    if (items.length === 0) return setError("Adicione ao menos um produto ao movimento.");
    setSaving(true); setError("");
    try {
      const movement = await createStockMovement({ description: description.trim(), movementDate: date, items: items.map(({ key: _key, ...item }) => item) });
      router.push(`/estoque/movimentos/${movement.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o movimento.");
      setSaving(false);
    }
  }

  const productName = (id: string) => products.find((p) => p.id === id);
  const locationName = (id?: string) => locations.find((l) => l.id === id)?.description ?? "";
  const operationLabel = (item: Draft) => (item.operation === "ADD" ? "Entrada" : item.operation === "REMOVE" ? "Saída" : "Transferência");

  const sort = useSort(items, { description: (i) => productName(i.productId)?.description, type: (i) => operationLabel(i), quantity: (i) => i.quantity, cost: (i) => i.cost, location: (i) => locationName(i.fromLocationId ?? i.toLocationId) });

  return (
    <PageShell permissionKey={MOVEMENTS_PERMISSION_KEY}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Movimentos de Estoque", href: "/estoque/movimentos" }, { label: "Novo Movimento de Estoque" }]} />
          <h1 className="mb-4 text-xl font-bold text-ds-primary-deep">Novo Movimento de Estoque</h1>

          <section className="rounded-xl border border-ds-border-subtle bg-white p-5">
            <h2 className="mb-3 text-base font-semibold text-ds-primary-deep">Dados Básicos</h2>
            <div className="grid gap-4 border-b border-ds-border-subtle pb-5 md:grid-cols-[1fr_220px]">
              <label className="flex flex-col gap-1.5"><FieldLabel>Descrição do Movimento <span className="text-ds-danger">*</span></FieldLabel>
                <Input value={description} maxLength={200} onChange={(e) => { setDescription(e.target.value); setError(""); }} placeholder="Insira a Descrição do Movimento" autoFocus />
              </label>
              <label className="flex flex-col gap-1.5"><FieldLabel>Data do Movimento <span className="text-ds-danger">*</span></FieldLabel>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>

            <div className="flex items-center justify-between py-4">
              <h2 className="text-base font-semibold text-ds-primary-deep">Itens do Movimento</h2>
              <button type="button" onClick={openModal} className="rounded-md border border-ds-primary px-3 py-1.5 text-xs font-bold text-ds-primary hover:bg-ds-primary hover:text-white">Adicionar Produto</button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-ds-text-secondary">
                <Icon name="inventory_2" className="!text-[72px] text-ds-border" />
                <p className="text-sm">Nenhum Produto Adicionado</p>
              </div>
            ) : (
              <div className="ds-table-wrap">
                <table className="ds-table">
                  <thead><tr><th aria-sort={sort.ariaSort("description")}><SortButton {...sort.header("description", "Descrição")} /></th><th aria-sort={sort.ariaSort("type")}><SortButton {...sort.header("type", "Tipo")} /></th><th className="text-right" aria-sort={sort.ariaSort("quantity")}><SortButton {...sort.header("quantity", "Quant.")} /></th><th className="text-right" aria-sort={sort.ariaSort("cost")}><SortButton {...sort.header("cost", "Custo")} /></th><th aria-sort={sort.ariaSort("location")}><SortButton {...sort.header("location", "Estoque")} /></th><th /></tr></thead>
                  <tbody>
                    {sort.sorted.map((item) => (
                      <tr key={item.key}>
                        <td data-label="Descrição">{productName(item.productId)?.description}</td>
                        <td data-label="Tipo">{operationLabel(item)}</td>
                        <td data-label="Quant." className="whitespace-nowrap md:text-right">{formatQty(item.quantity)} {productName(item.productId)?.unit}</td>
                        <td data-label="Custo" className="whitespace-nowrap md:text-right">{formatMoney(item.cost)}</td>
                        <td data-label="Estoque">{item.operation === "TRANSFER" ? `${locationName(item.fromLocationId)} → ${locationName(item.toLocationId)}` : locationName(item.fromLocationId ?? item.toLocationId)}</td>
                        <td data-label="Remover"><button type="button" aria-label="Remover item" onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))} className="text-ds-danger-text hover:opacity-70"><Icon name="delete" className="text-[18px]" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {error && <p role="alert" className="mt-4 text-sm text-ds-danger-text">{error}</p>}
            <div className="mt-5 flex flex-wrap gap-3 border-t border-ds-border-subtle pt-5">
              <Button type="button" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar Movimentação"}</Button>
              <Link href="/estoque/movimentos" className="inline-flex h-11 items-center rounded-[10px] border border-ds-border px-5 text-sm font-bold text-ds-primary-deep hover:border-ds-primary hover:text-ds-primary">Cancelar</Link>
            </div>
          </section>

          <Modal open={open} onClose={() => setOpen(false)} labelledBy="movement-item-title">
            <h2 id="movement-item-title" className="mb-4 text-lg font-bold text-ds-primary-deep">Novo Produto a Movimentar</h2>
            <div className="mb-4 flex flex-col gap-1.5">
              <FieldLabel>Operação <span className="text-ds-danger">*</span></FieldLabel>
              <div className="inline-flex self-start overflow-hidden rounded-lg border border-ds-primary-deep">
                {OPERATIONS.map((op) => (
                  <button key={op.value} type="button" onClick={() => { setOperation(op.value); setModalError(""); setToId(op.value === "TRANSFER" ? "" : principalId); }} className={`px-4 py-2 text-sm font-semibold ${operation === op.value ? "bg-ds-primary-deep text-white" : "bg-white text-ds-primary-deep"}`}>{op.label}</button>
                ))}
              </div>
            </div>
            <label className="mb-4 flex flex-col gap-1.5"><FieldLabel>Produto <span className="text-ds-danger">*</span></FieldLabel>
              <select value={productId} onChange={(e) => chooseProduct(e.target.value)} className={selectClass}>
                <option value="">Selecione...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.description}</option>)}
              </select>
            </label>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5"><FieldLabel>Quantidade <span className="text-ds-danger">*</span></FieldLabel>
                <div className="flex"><Input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^\d,]/g, ""))} className="rounded-r-none" /><span className="flex items-center rounded-r-[10px] border border-l-0 border-ds-border bg-ds-bg px-3 text-xs text-ds-text-secondary">{product?.unit ?? "UN"}</span></div>
              </label>
              <label className="flex flex-col gap-1.5"><FieldLabel>Custo <span className="text-ds-danger">*</span></FieldLabel>
                <div className="flex"><span className="flex items-center rounded-l-[10px] border border-r-0 border-ds-border bg-ds-bg px-3 text-xs text-ds-text-secondary">R$</span><Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d,]/g, ""))} className="rounded-l-none" /></div>
              </label>
            </div>
            {operation !== "ADD" && (
              <label className="mb-4 flex flex-col gap-1.5"><FieldLabel>Estoque de Saída <span className="text-ds-danger">*</span></FieldLabel>
                <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={selectClass}>{locations.map((l) => <option key={l.id} value={l.id}>{l.description}</option>)}</select>
                {product && <span className="text-xs text-ds-text-secondary">Disponível: {formatQty(available(fromId))} {product.unit}</span>}
              </label>
            )}
            {operation !== "REMOVE" && (
              <label className="mb-2 flex flex-col gap-1.5"><FieldLabel>Estoque de Destino <span className="text-ds-danger">*</span></FieldLabel>
                <select value={toId} onChange={(e) => setToId(e.target.value)} className={selectClass}>
                  {operation === "TRANSFER" && <option value="">Selecione...</option>}
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.description}</option>)}
                </select>
              </label>
            )}
            {modalError && <p role="alert" className="mt-2 text-sm text-ds-danger-text">{modalError}</p>}
            <div className="mt-5 flex justify-center gap-3 border-t border-ds-border-subtle pt-4">
              <Button type="button" onClick={confirmItem}>Confirmar</Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </Modal>
        </>
      )}
    </PageShell>
  );
}
