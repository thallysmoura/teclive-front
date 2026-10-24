"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import type { OpDefect, OpQuestionnaire } from "@/lib/operacional";

function useSubmit<T>(onSubmit: (v: T) => Promise<void>) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function run(value: T, validate?: () => string) {
    const problem = validate?.();
    if (problem) return setError(problem);
    setSaving(true); setError("");
    try { await onSubmit(value); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); setSaving(false); }
  }
  return { saving, error, setError, run };
}

function Footer({ saving, submitLabel, onCancel }: { saving: boolean; submitLabel: string; onCancel: () => void }) {
  return (
    <div className="flex flex-wrap gap-3 border-t border-ds-border-subtle pt-4">
      <Button type="submit" disabled={saving}>{saving ? "Salvando..." : submitLabel}</Button>
      <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
    </div>
  );
}

const Err = ({ text }: { text: string }) => (text ? <span role="alert" className="text-xs text-ds-danger-text">{text}</span> : null);

/** Descrição simples (causas e soluções). */
export function DescriptionForm({ label, initial, submitLabel, onSubmit, onCancel }: { label: string; initial?: { description: string }; submitLabel: string; onSubmit: (v: { description: string }) => Promise<void>; onCancel: () => void }) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const { saving, error, setError, run } = useSubmit(onSubmit);
  return (
    <form onSubmit={(e) => { e.preventDefault(); void run({ description: description.trim() }, () => (description.trim() ? "" : "Informe a descrição.")); }} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5"><FieldLabel>{label} <span className="text-ds-danger">*</span></FieldLabel>
        <Input autoFocus value={description} maxLength={200} error={!!error} onChange={(e) => { setDescription(e.target.value); setError(""); }} />
        <Err text={error} />
      </label>
      <Footer saving={saving} submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}

const split = (total: number) => ({ h: String(Math.floor(total / 60)), m: String(total % 60) });
const toMinutes = (h: string, m: string) => (Number(h) || 0) * 60 + (Number(m) || 0);

function Duration({ label, hint, h, m, onChange }: { label: string; hint: string; h: string; m: string; onChange: (h: string, m: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5"><FieldLabel>{label}</FieldLabel></legend>
      <div className="flex items-center gap-2">
        <Input type="number" min={0} max={9999} value={h} onChange={(e) => onChange(e.target.value, m)} className="w-24" aria-label={`${label} (horas)`} /><span className="text-sm text-ds-text-secondary">h</span>
        <Input type="number" min={0} max={59} value={m} onChange={(e) => onChange(h, e.target.value)} className="w-24" aria-label={`${label} (minutos)`} /><span className="text-sm text-ds-text-secondary">min</span>
      </div>
      <span className="text-xs text-ds-text-secondary">{hint}</span>
    </fieldset>
  );
}

export function DefectForm({ initial, submitLabel, onSubmit, onCancel }: { initial?: OpDefect; submitLabel: string; onSubmit: (v: { description: string; serviceMinutes: number; closingMinutes: number }) => Promise<void>; onCancel: () => void }) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [service, setService] = useState(split(initial?.serviceMinutes ?? 0));
  const [closing, setClosing] = useState(split(initial?.closingMinutes ?? 0));
  const { saving, error, setError, run } = useSubmit(onSubmit);
  return (
    <form onSubmit={(e) => { e.preventDefault(); void run({ description: description.trim(), serviceMinutes: toMinutes(service.h, service.m), closingMinutes: toMinutes(closing.h, closing.m) }, () => (description.trim() ? "" : "Informe a descrição.")); }} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5"><FieldLabel>Descrição <span className="text-ds-danger">*</span></FieldLabel>
        <Input autoFocus value={description} maxLength={200} error={!!error} onChange={(e) => { setDescription(e.target.value); setError(""); }} />
        <Err text={error} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Duration label="Prazo de atendimento" hint="Tempo máximo para iniciar o atendimento." h={service.h} m={service.m} onChange={(h, m) => setService({ h, m })} />
        <Duration label="Previsão de fechamento" hint="Tempo previsto para concluir a OS." h={closing.h} m={closing.m} onChange={(h, m) => setClosing({ h, m })} />
      </div>
      <Footer saving={saving} submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}

export function QuestionnaireForm({ initial, submitLabel, onSubmit, onCancel }: { initial?: OpQuestionnaire; submitLabel: string; onSubmit: (v: { title: string; description: string; questionCount: number }) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [count, setCount] = useState(String(initial?.questionCount ?? 0));
  const { saving, error, setError, run } = useSubmit(onSubmit);
  return (
    <form onSubmit={(e) => { e.preventDefault(); void run({ title: title.trim(), description: description.trim(), questionCount: Number(count) || 0 }, () => (title.trim() ? "" : "Informe o título.")); }} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5"><FieldLabel>Título <span className="text-ds-danger">*</span></FieldLabel>
        <Input autoFocus value={title} maxLength={200} error={!!error} onChange={(e) => { setTitle(e.target.value); setError(""); }} />
        <Err text={error} />
      </label>
      <label className="flex flex-col gap-1.5"><FieldLabel>Descrição</FieldLabel><Input value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} /></label>
      <label className="flex flex-col gap-1.5"><FieldLabel>Quantidade de perguntas</FieldLabel><Input type="number" min={0} max={999} value={count} onChange={(e) => setCount(e.target.value)} className="w-32" /></label>
      <Footer saving={saving} submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}
