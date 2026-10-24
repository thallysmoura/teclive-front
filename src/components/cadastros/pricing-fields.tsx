"use client";

import { FieldLabel, Input } from "@/components/ui/input";
import { toInput, toNumber } from "@/lib/cadastros";

export type Pricing = { cost: string; margin: string; price: string };

export const initialPricing = (cost: number | string | null = 0, margin: number | string | null = 50, price: number | string | null = 0): Pricing => ({
  cost: toInput(cost), margin: toInput(margin), price: toInput(price),
});

const clean = (value: string) => value.replace(/[^\d,]/g, "");

/** Custo, margem e venda: a venda é custo × (1 + margem) e editar a venda recalcula a margem. */
export function PricingFields({ value, onChange }: { value: Pricing; onChange: (next: Pricing) => void }) {
  function setCost(raw: string) {
    const cost = clean(raw);
    onChange({ cost, margin: value.margin, price: toInput(toNumber(cost) * (1 + toNumber(value.margin) / 100)) });
  }
  function setMargin(raw: string) {
    const margin = clean(raw);
    onChange({ cost: value.cost, margin, price: toInput(toNumber(value.cost) * (1 + toNumber(margin) / 100)) });
  }
  function setPrice(raw: string) {
    const price = clean(raw);
    const cost = toNumber(value.cost);
    onChange({ cost: value.cost, price, margin: cost > 0 ? toInput((toNumber(price) / cost - 1) * 100) : value.margin });
  }
  const addon = "flex items-center border border-ds-border bg-ds-bg px-3 text-xs text-ds-text-secondary";
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="flex flex-col gap-1.5"><FieldLabel>Custo <span className="text-ds-danger">*</span></FieldLabel>
        <div className="flex"><span className={`${addon} rounded-l-[10px] border-r-0`}>R$</span><Input inputMode="decimal" value={value.cost} onChange={(e) => setCost(e.target.value)} className="rounded-l-none" /></div>
      </label>
      <label className="flex flex-col gap-1.5"><FieldLabel>Margem <span className="text-ds-danger">*</span></FieldLabel>
        <div className="flex"><span className={`${addon} rounded-l-[10px] border-r-0`}>%</span><Input inputMode="decimal" value={value.margin} onChange={(e) => setMargin(e.target.value)} className="rounded-l-none" /></div>
      </label>
      <label className="flex flex-col gap-1.5"><FieldLabel>Venda <span className="text-ds-danger">*</span></FieldLabel>
        <div className="flex"><span className={`${addon} rounded-l-[10px] border-r-0`}>R$</span><Input inputMode="decimal" value={value.price} onChange={(e) => setPrice(e.target.value)} className="rounded-l-none" /></div>
      </label>
    </div>
  );
}
