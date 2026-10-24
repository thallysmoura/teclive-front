"use client";

import { useEffect, useState } from "react";
import { maskDocument, type Person } from "@/lib/cadastros";
import { sellersClient } from "@/lib/comercial";
import { formatPhone } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";

const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";

export type LeadFormValue = { type: "F" | "J"; name: string; nickname: string; document: string; sellerName: string; phone: string; email: string };

export function LeadForm({ initial, submitLabel, onSubmit, onCancel }: { initial?: Person; submitLabel: string; onSubmit: (value: LeadFormValue) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<LeadFormValue>({
    type: initial?.type ?? "F", name: initial?.name ?? "", nickname: initial?.nickname ?? "", document: initial ? maskDocument(initial.document ?? "", initial.type) : "",
    sellerName: initial?.sellerName ?? "", phone: initial?.phone ?? "", email: initial?.email ?? "",
  });
  const [sellers, setSellers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { sellersClient.list().then((r) => setSellers(r.map((s) => s.name))).catch(() => {}); }, []);

  const set = <K extends keyof LeadFormValue>(key: K, value: LeadFormValue[K]) => { setForm((f) => ({ ...f, [key]: value })); setError(""); };
  const juridica = form.type === "J";
  const sellerOptions = form.sellerName && !sellers.includes(form.sellerName) ? [form.sellerName, ...sellers] : sellers;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError(juridica ? "Informe a razão social." : "Informe o nome do lead.");
    setSaving(true); setError("");
    try { await onSubmit({ ...form, name: form.name.trim() }); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); setSaving(false); }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Tipo de Lead</FieldLabel>
        <div className="inline-flex self-start overflow-hidden rounded-lg border border-ds-primary-deep">
          {([["F", "Física"], ["J", "Jurídica"]] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setForm((f) => ({ ...f, type: value, document: maskDocument(f.document, value) }))} className={`px-4 py-2 text-sm font-semibold ${form.type === value ? "bg-ds-primary-deep text-white" : "bg-white text-ds-primary-deep"}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5"><FieldLabel>{juridica ? "Razão Social" : "Nome"} <span className="text-ds-danger">*</span></FieldLabel>
          <Input autoFocus value={form.name} maxLength={200} placeholder={juridica ? "Insira a razão social" : "Insira o nome do lead"} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5"><FieldLabel>{juridica ? "Nome Fantasia" : "Apelido"}</FieldLabel><Input value={form.nickname} placeholder={juridica ? "Insira o nome fantasia" : "Insira o apelido"} onChange={(e) => set("nickname", e.target.value)} /></label>
        <label className="flex flex-col gap-1.5"><FieldLabel>{juridica ? "CNPJ" : "CPF"}</FieldLabel><Input inputMode="numeric" value={form.document} placeholder={juridica ? "Insira o CNPJ" : "Insira o CPF"} onChange={(e) => set("document", maskDocument(e.target.value, form.type))} /></label>
        <label className="flex flex-col gap-1.5"><FieldLabel>Vendedor</FieldLabel>
          <select value={form.sellerName} onChange={(e) => set("sellerName", e.target.value)} className={selectClass}><option value="">Selecione...</option>{sellerOptions.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1.5"><FieldLabel>Telefone</FieldLabel><Input inputMode="tel" value={form.phone} placeholder="Insira o número do telefone" onChange={(e) => set("phone", formatPhone(e.target.value))} /></label>
        <label className="flex flex-col gap-1.5"><FieldLabel>E-mail</FieldLabel><Input type="email" value={form.email} placeholder="Insira o E-mail" onChange={(e) => set("email", e.target.value)} /></label>
      </div>
      {error && <p role="alert" className="text-sm text-ds-danger-text">{error}</p>}
      <div className="flex flex-wrap gap-3 border-t border-ds-border-subtle pt-4">
        <Button type="submit" disabled={saving}>{saving ? "Salvando..." : submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}
