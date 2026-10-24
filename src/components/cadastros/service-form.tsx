"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { servicesClient, toNumber, type ServiceInput, type ServiceItem } from "@/lib/cadastros";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { PricingFields, initialPricing } from "@/components/cadastros/pricing-fields";

const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";

export function ServiceForm({ initial, submitLabel, onSubmit, embedded, onCancel }: { embedded?: boolean; onCancel?: () => void; initial?: ServiceItem; submitLabel: string; onSubmit: (input: ServiceInput) => Promise<void> }) {
  const [modality, setModality] = useState(initial?.modality ?? 2);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [categories, setCategories] = useState<string[]>([]);
  const [pricing, setPricing] = useState(() => initialPricing(initial?.cost ?? 0, initial?.margin ?? 50, initial?.price ?? 0));
  const [allowsRental, setAllowsRental] = useState(initial?.allowsRental ?? false);
  const [blocks, setBlocks] = useState(initial?.blocksOnDelinquency ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { servicesClient.categories().then(setCategories).catch(() => {}); }, []);
  const options = category && !categories.includes(category) ? [category, ...categories] : categories;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return setError("Informe a descrição do serviço.");
    if (!category) return setError("Selecione a categoria da receita.");
    setSaving(true); setError("");
    try {
      await onSubmit({ description: description.trim(), category, modality, allowsRental, blocksOnDelinquency: blocks, cost: toNumber(pricing.cost), margin: toNumber(pricing.margin), price: toNumber(pricing.price) });
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); setSaving(false); }
  }

  const check = "mt-0.5 h-4 w-4 accent-ds-primary";
  return (
    <form onSubmit={submit} noValidate className={embedded ? "" : "rounded-xl border border-ds-border-subtle bg-white p-5"}>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-ds-primary-deep">Dados Básicos</h2>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Serviço para</FieldLabel>
            <div className="inline-flex self-start overflow-hidden rounded-lg border border-ds-primary-deep">
              {([[2, "Contratos"], [1, "Ordens de Serviço"]] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setModality(value)} className={`px-4 py-2 text-sm font-semibold ${modality === value ? "bg-ds-primary-deep text-white" : "bg-white text-ds-primary-deep"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5"><FieldLabel>Descrição <span className="text-ds-danger">*</span></FieldLabel>
              <Input autoFocus value={description} maxLength={200} onChange={(e) => { setDescription(e.target.value); setError(""); }} />
            </label>
            <label className="flex flex-col gap-1.5"><FieldLabel>Categoria da Receita <span className="text-ds-danger">*</span></FieldLabel>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setError(""); }} className={selectClass}>
                <option value="">Selecione...</option>{options.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <h2 className="mt-2 text-base font-semibold text-ds-primary-deep">Precificação</h2>
          <PricingFields value={pricing} onChange={setPricing} />
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-ds-primary-deep">Configurações</h2>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-ds-text"><input type="checkbox" checked={allowsRental} onChange={(e) => setAllowsRental(e.target.checked)} className={check} /><span>Serviço para Locações<span className="block text-xs text-ds-text-secondary">Utilizado para cobrança recorrente de equipamentos locados.</span></span></label>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-ds-text"><input type="checkbox" checked={blocks} onChange={(e) => setBlocks(e.target.checked)} className={check} /><span>Permite bloqueio por inadimplência<span className="block text-xs text-ds-text-secondary">Serviço elegível para bloquear um cliente caso ocorra inadimplência.</span></span></label>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-ds-danger-text">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3 border-t border-ds-border-subtle pt-5">
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : submitLabel}</Button>
        {onCancel ? <button type="button" onClick={onCancel} className="inline-flex h-11 items-center rounded-[10px] border border-ds-border px-5 text-sm font-bold text-ds-primary-deep hover:border-ds-primary hover:text-ds-primary">Cancelar</button> : <Link href="/cadastros/servicos" className="inline-flex h-11 items-center rounded-[10px] border border-ds-border px-5 text-sm font-bold text-ds-primary-deep hover:border-ds-primary hover:text-ds-primary">Cancelar</Link>}
      </div>
    </form>
  );
}
