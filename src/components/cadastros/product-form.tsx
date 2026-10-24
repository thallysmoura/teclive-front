"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { catalogClient, productsClient, toNumber, type Product, type ProductInput } from "@/lib/cadastros";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { PricingFields, initialPricing } from "@/components/cadastros/pricing-fields";

const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";

export function ProductForm({ initial, submitLabel, onSubmit, embedded, onCancel }: { embedded?: boolean; onCancel?: () => void; initial?: Product; submitLabel: string; onSubmit: (input: ProductInput) => Promise<void> }) {
  const [form, setForm] = useState({
    description: initial?.description ?? "", unit: initial?.unit ?? "UN", productGroup: initial?.productGroup ?? "", brand: initial?.brand ?? "", model: initial?.model ?? "",
    alternativeDescription: initial?.alternativeDescription ?? "", identifier: initial?.identifier ?? "", supplierCode: initial?.supplierCode ?? "", barcode: initial?.barcode ?? "",
    allowNegativeStock: initial?.allowNegativeStock ?? false, allowRental: initial?.allowRental ?? false,
  });
  const [pricing, setPricing] = useState(() => initialPricing(initial?.costPrice ?? 0, initial?.margin ?? 50, initial?.salePrice ?? 0));
  const [units, setUnits] = useState<{ code: string; name: string }[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    productsClient.units().then(setUnits).catch(() => {});
    fetchAll("brands").then(setBrands).catch(() => {});
    fetchAll("product-groups").then(setGroups).catch(() => {});
  }, []);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => { setForm((f) => ({ ...f, [key]: value })); setError(""); };
  const withCurrent = (list: string[], current: string) => (current && !list.includes(current) ? [current, ...list] : list);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) return setError("Informe a descrição do produto.");
    if (!form.productGroup) return setError("Selecione o grupo de produtos.");
    if (!form.brand) return setError("Selecione a marca.");
    setSaving(true); setError("");
    try {
      await onSubmit({ ...form, description: form.description.trim(), costPrice: toNumber(pricing.cost), margin: toNumber(pricing.margin), salePrice: toNumber(pricing.price) });
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); setSaving(false); }
  }

  const text = (key: "model" | "alternativeDescription" | "identifier" | "supplierCode" | "barcode", placeholder: string, max = 200) => (
    <Input value={form[key]} maxLength={max} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} />
  );
  const check = "mt-0.5 h-4 w-4 accent-ds-primary";

  return (
    <form onSubmit={submit} noValidate className={embedded ? "" : "rounded-xl border border-ds-border-subtle bg-white p-5"}>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-ds-primary-deep">Dados Básicos</h2>
          <label className="flex flex-col gap-1.5"><FieldLabel>Descrição <span className="text-ds-danger">*</span></FieldLabel>
            <Input autoFocus value={form.description} maxLength={300} placeholder="Insira a descrição do produto" onChange={(e) => set("description", e.target.value)} />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5"><FieldLabel>Unidade de Medida <span className="text-ds-danger">*</span></FieldLabel>
              <select value={form.unit} onChange={(e) => set("unit", e.target.value)} className={selectClass}>{units.map((u) => <option key={u.code} value={u.code}>{u.code} - {u.name}</option>)}{units.length === 0 && <option value={form.unit}>{form.unit}</option>}</select>
            </label>
            <label className="flex flex-col gap-1.5"><FieldLabel>Grupo de Produtos <span className="text-ds-danger">*</span></FieldLabel>
              <select value={form.productGroup} onChange={(e) => set("productGroup", e.target.value)} className={selectClass}><option value="">Selecione...</option>{withCurrent(groups, form.productGroup).map((g) => <option key={g}>{g}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1.5"><FieldLabel>Marca <span className="text-ds-danger">*</span></FieldLabel>
              <select value={form.brand} onChange={(e) => set("brand", e.target.value)} className={selectClass}><option value="">Selecione...</option>{withCurrent(brands, form.brand).map((b) => <option key={b}>{b}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1.5"><FieldLabel>Modelo</FieldLabel>{text("model", "Insira o modelo do produto")}</label>
          </div>
          <h2 className="mt-2 text-base font-semibold text-ds-primary-deep">Precificação</h2>
          <PricingFields value={pricing} onChange={setPricing} />
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-ds-primary-deep">Informações Adicionais</h2>
          <label className="flex flex-col gap-1.5"><FieldLabel>Descrição Alternativa</FieldLabel>{text("alternativeDescription", "Insira uma descrição alternativa", 300)}</label>
          <label className="flex flex-col gap-1.5"><FieldLabel>Identificador</FieldLabel>{text("identifier", "Insira o identificador", 60)}</label>
          <label className="flex flex-col gap-1.5"><FieldLabel>Código Fornecedor</FieldLabel>{text("supplierCode", "Insira o código do fornecedor", 60)}</label>
          <label className="flex flex-col gap-1.5"><FieldLabel>Código de Barras</FieldLabel>{text("barcode", "Insira o número do código de barras", 60)}</label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ds-text"><input type="checkbox" checked={form.allowNegativeStock} onChange={(e) => set("allowNegativeStock", e.target.checked)} className={check} />Permite Estoque Negativo</label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ds-text"><input type="checkbox" checked={form.allowRental} onChange={(e) => set("allowRental", e.target.checked)} className={check} />Pode ser Locado</label>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-ds-danger-text">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3 border-t border-ds-border-subtle pt-5">
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : submitLabel}</Button>
        {onCancel ? <button type="button" onClick={onCancel} className="inline-flex h-11 items-center rounded-[10px] border border-ds-border px-5 text-sm font-bold text-ds-primary-deep hover:border-ds-primary hover:text-ds-primary">Cancelar</button> : <Link href="/cadastros/produtos" className="inline-flex h-11 items-center rounded-[10px] border border-ds-border px-5 text-sm font-bold text-ds-primary-deep hover:border-ds-primary hover:text-ds-primary">Cancelar</Link>}
      </div>
    </form>
  );
}

async function fetchAll(kind: "brands" | "product-groups"): Promise<string[]> {
  const result = await catalogClient(kind).list({ page: 1 });
  const pages = Math.ceil(result.totalRegistros / result.tamanhoPagina);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => catalogClient(kind).list({ page: i + 2 })));
  return [result, ...rest].flatMap((p) => p.lista).filter((i) => i.isActive).map((i) => i.description);
}
