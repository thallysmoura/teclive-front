"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";

/** Formulário de um único campo de descrição (marcas, grupos, ramos). */
export function CatalogForm({ title, help, fieldLabel, initial = "", submitLabel, backHref, onSubmit, embedded, onCancel }: {
  embedded?: boolean; onCancel?: () => void;
  title: string; help: string; fieldLabel: string; initial?: string; submitLabel: string; backHref: string;
  onSubmit: (description: string) => Promise<void>;
}) {
  const [description, setDescription] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return setError("Informe a descrição.");
    setSaving(true); setError("");
    try { await onSubmit(description.trim()); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); setSaving(false); }
  }

  return (
    <section className={embedded ? "" : "rounded-xl border border-ds-border-subtle bg-white p-5"}>
      {!embedded && <h1 className="text-base font-semibold text-ds-primary-deep">{title}</h1>}
      <p className="mb-4 border-b border-ds-border-subtle pb-3 text-xs text-ds-text-secondary">{help}</p>
      <form onSubmit={submit} noValidate className="flex max-w-xl flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>{fieldLabel} <span className="text-ds-danger">*</span></FieldLabel>
          <Input autoFocus value={description} maxLength={200} error={!!error} onChange={(e) => { setDescription(e.target.value); setError(""); }} />
          {error && <span role="alert" className="text-xs text-ds-danger-text">{error}</span>}
        </label>
        <div className="flex flex-wrap items-center gap-3 text-sm text-ds-text-secondary">
          <Button type="submit" disabled={saving} className="inline-flex items-center gap-2"><Icon name="save" className="text-[18px]" />{saving ? "Salvando..." : submitLabel}</Button>
          {onCancel ? <button type="button" onClick={onCancel} className="font-semibold text-ds-primary-deep hover:text-ds-primary">Cancelar</button> : <span>ou <Link href={backHref} className="font-semibold text-ds-primary-deep hover:text-ds-primary">voltar à listagem</Link></span>}
        </div>
      </form>
    </section>
  );
}
