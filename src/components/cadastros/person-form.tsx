"use client";

import { useState } from "react";
import Link from "next/link";
import { PERSON_ROLES, maskDocument, type Person, type PersonInput } from "@/lib/cadastros";
import { formatPhone } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";

const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";
const TAXPAYER = [[1, "Contribuinte ICMS"], [2, "Contribuinte isento de Inscrição Estadual"], [9, "Não Contribuinte"]] as const;

export function PersonForm({ initial, submitLabel, onSubmit, embedded, onCancel }: { embedded?: boolean; onCancel?: () => void; initial?: Person; submitLabel: string; onSubmit: (input: PersonInput) => Promise<void> }) {
  const [form, setForm] = useState<PersonInput>({
    type: initial?.type ?? "F", name: initial?.name ?? "", nickname: initial?.nickname ?? "", document: initial ? maskDocument(initial.document ?? "", initial.type) : "", rg: initial?.rg ?? "",
    identifier: initial?.identifier ?? "", isClient: initial?.isClient ?? true, isSupplier: initial?.isSupplier ?? false, isEmployee: initial?.isEmployee ?? false,
    isTechnician: initial?.isTechnician ?? false, isCarrier: initial?.isCarrier ?? false, isSeller: initial?.isSeller ?? false, taxpayerType: initial?.taxpayerType ?? null,
    isFinalConsumer: initial?.isFinalConsumer ?? false, municipalRegistration: initial?.municipalRegistration ?? "", stateRegistration: initial?.stateRegistration ?? "",
    email: initial?.email ?? "", phone: initial?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) => { setForm((f) => ({ ...f, [key]: value })); setError(""); };
  const juridica = form.type === "J";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError(juridica ? "Informe a razão social." : "Informe o nome da pessoa.");
    if (!PERSON_ROLES.some(([key]) => form[key])) return setError("Selecione ao menos um tipo de cadastro.");
    setSaving(true); setError("");
    try { await onSubmit({ ...form, name: form.name.trim() }); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); setSaving(false); }
  }

  const field = (label: string, key: "nickname" | "rg" | "identifier" | "municipalRegistration" | "stateRegistration" | "email", placeholder: string) => (
    <label className="flex flex-col gap-1.5"><FieldLabel>{label}</FieldLabel><Input value={form[key] ?? ""} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} /></label>
  );

  return (
    <form onSubmit={submit} noValidate className={embedded ? "" : "rounded-xl border border-ds-border-subtle bg-white p-5"}>
      <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-ds-primary-deep">Dados Básicos</h2>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Tipo de Pessoa</FieldLabel>
            <div className="inline-flex self-start overflow-hidden rounded-lg border border-ds-primary-deep">
              {([["F", "Física"], ["J", "Jurídica"]] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setForm((f) => ({ ...f, type: value, document: maskDocument(f.document, value), rg: value === "J" ? "" : f.rg }))} className={`px-4 py-2 text-sm font-semibold ${form.type === value ? "bg-ds-primary-deep text-white" : "bg-white text-ds-primary-deep"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5"><FieldLabel>{juridica ? "Razão Social" : "Nome"} <span className="text-ds-danger">*</span></FieldLabel>
              <Input autoFocus value={form.name} maxLength={200} placeholder={juridica ? "Insira a razão social" : "Insira o nome da pessoa"} onChange={(e) => set("name", e.target.value)} />
            </label>
            {field(juridica ? "Nome Fantasia" : "Apelido", "nickname", juridica ? "Insira o nome fantasia" : "Insira o apelido")}
            <label className="flex flex-col gap-1.5"><FieldLabel>{juridica ? "CNPJ" : "CPF"}</FieldLabel>
              <Input inputMode="numeric" value={form.document} placeholder={juridica ? "Insira o CNPJ" : "Insira o CPF"} onChange={(e) => set("document", maskDocument(e.target.value, form.type))} />
            </label>
            {!juridica && field("RG", "rg", "Insira o RG")}
            {field("Identificador", "identifier", "Insira o Identificador")}
            {field("E-mail", "email", "Insira o e-mail")}
            <label className="flex flex-col gap-1.5"><FieldLabel>Telefone</FieldLabel><Input inputMode="tel" value={form.phone ?? ""} placeholder="(00) 00000-0000" onChange={(e) => set("phone", formatPhone(e.target.value))} /></label>
          </div>

          <h2 className="mt-2 border-t border-ds-border-subtle pt-4 text-base font-semibold text-ds-primary-deep">Dados Tributários</h2>
          <div className="grid items-end gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5"><FieldLabel>Tipo de Contribuinte</FieldLabel>
              <select value={form.taxpayerType ?? ""} onChange={(e) => set("taxpayerType", e.target.value ? Number(e.target.value) : null)} className={selectClass}>
                <option value="">Selecione...</option>{TAXPAYER.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="flex h-11 cursor-pointer items-center gap-2 text-sm text-ds-text"><input type="checkbox" checked={form.isFinalConsumer} onChange={(e) => set("isFinalConsumer", e.target.checked)} className="h-4 w-4 accent-ds-primary" />Consumidor Final</label>
            {field("Inscrição Municipal", "municipalRegistration", "Insira a Inscrição Municipal")}
            {juridica && field("Inscrição Estadual", "stateRegistration", "Insira a Inscrição Estadual")}
          </div>
        </div>

        <fieldset className="flex flex-col gap-2 self-start">
          <legend className="mb-1 text-sm font-semibold text-ds-primary-deep">Tipo de Cadastro <span className="text-ds-danger">*</span></legend>
          {PERSON_ROLES.map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-ds-text"><input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="h-4 w-4 accent-ds-primary" />{label}</label>
          ))}
        </fieldset>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-ds-danger-text">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3 border-t border-ds-border-subtle pt-5">
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : submitLabel}</Button>
        {onCancel ? <button type="button" onClick={onCancel} className="inline-flex h-11 items-center rounded-[10px] border border-ds-border px-5 text-sm font-bold text-ds-primary-deep hover:border-ds-primary hover:text-ds-primary">Cancelar</button> : <Link href="/cadastros/pessoas" className="inline-flex h-11 items-center rounded-[10px] border border-ds-border px-5 text-sm font-bold text-ds-primary-deep hover:border-ds-primary hover:text-ds-primary">Cancelar</Link>}
      </div>
    </form>
  );
}
