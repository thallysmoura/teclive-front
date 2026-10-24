"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";

export function LocationForm({ title, initial = "", submitLabel, backHref, backLabel, onSubmit, embedded, onCancel }: {
  embedded?: boolean; onCancel?: () => void;
  title: string; initial?: string; submitLabel: string; backHref: string; backLabel: string;
  onSubmit: (description: string) => Promise<void>;
}) {
  const [description, setDescription] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return setError("Informe a descrição do local de estoque.");
    setSaving(true); setError("");
    try { await onSubmit(description.trim()); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); setSaving(false); }
  }

  return (
    <section className={embedded ? "" : "rounded-xl border border-ds-border-subtle bg-white p-5"}>
      {!embedded && <h1 className="mb-4 border-b border-ds-border-subtle pb-2 text-base font-semibold text-ds-primary-deep">{title}</h1>}
      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Descrição <span className="text-ds-danger">*</span></FieldLabel>
            <Input autoFocus value={description} maxLength={200} error={!!error} onChange={(e) => { setDescription(e.target.value); setError(""); }} />
            {error && <span role="alert" className="text-xs text-ds-danger-text">{error}</span>}
          </label>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ds-text-secondary">
            <Button type="submit" disabled={saving} className="inline-flex items-center gap-2"><Icon name="save" className="text-[18px]" />{saving ? "Salvando..." : submitLabel}</Button>
            {onCancel ? <button type="button" onClick={onCancel} className="font-semibold text-ds-primary-deep hover:text-ds-primary">Cancelar</button> : <span>ou <Link href={backHref} className="font-semibold text-ds-primary-deep hover:text-ds-primary">{backLabel}</Link></span>}
          </div>
        </form>
        <aside className="self-start rounded-lg border border-ds-border-subtle">
          <h2 className="flex items-center gap-2 border-b border-ds-border-subtle bg-ds-bg px-4 py-2 text-xs font-semibold text-ds-text-muted"><Icon name="info" className="text-[16px]" />Informações</h2>
          <p className="p-4 text-sm text-ds-text-muted">Local de estoque é usado para registrar os locais de armazenamento de produtos, auxilia no gerenciamento de inventário e controle de estoque, permitindo monitorar quantidades, localização e movimentação de itens de estoque.</p>
        </aside>
      </div>
    </section>
  );
}
