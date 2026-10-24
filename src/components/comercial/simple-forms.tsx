"use client";

import { useState } from "react";
import { CHANNELS, SUPPORT_TEAMS, type RefusalReason, type SalesAction, type SalesActionInput } from "@/lib/comercial";
import { ClientPicker } from "@/components/comercial/client-picker";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";

const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";

function Footer({ saving, submitLabel, onCancel, extra }: { saving: boolean; submitLabel: string; onCancel: () => void; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-3 border-t border-ds-border-subtle pt-4">
      <Button type="submit" disabled={saving}>{saving ? "Salvando..." : submitLabel}</Button>
      {extra}
      <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
    </div>
  );
}

/** Motivo de recusa: a categoria ("usar quando") não muda depois de criada. */
export function RefusalForm({ initial, submitLabel, onSubmit, onCancel }: { initial?: RefusalReason; submitLabel: string; onSubmit: (v: { description: string; usedWhen: "CLIENT" | "MANAGEMENT" }) => Promise<void>; onCancel: () => void }) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [usedWhen, setUsedWhen] = useState<"CLIENT" | "MANAGEMENT">(initial?.usedWhen ?? "CLIENT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return setError("Informe a descrição.");
    setSaving(true); setError("");
    try { await onSubmit({ description: description.trim(), usedWhen }); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); setSaving(false); }
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-xs text-ds-text-secondary">Usado para categorizar um orçamento recusado, seja ele recusado pelo cliente ou não autorizado pelo setor financeiro.</p>
      <label className="flex flex-col gap-1.5"><FieldLabel>Descrição <span className="text-ds-danger">*</span></FieldLabel>
        <Input autoFocus value={description} maxLength={200} error={!!error} onChange={(e) => { setDescription(e.target.value); setError(""); }} />
        {error && <span role="alert" className="text-xs text-ds-danger-text">{error}</span>}
      </label>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Usar quando <span className="text-ds-danger">*</span></FieldLabel>
        <div className="inline-flex self-start overflow-hidden rounded-lg border border-ds-primary-deep">
          {([["CLIENT", "Recusado pelo cliente"], ["MANAGEMENT", "Recusado pela gestão"]] as const).map(([value, label]) => (
            <button key={value} type="button" disabled={!!initial && initial.usedWhen !== value} onClick={() => setUsedWhen(value)} className={`px-4 py-2 text-sm font-semibold disabled:opacity-40 ${usedWhen === value ? "bg-ds-primary-deep text-white" : "bg-white text-ds-primary-deep"}`}>{label}</button>
          ))}
        </div>
        {initial && <span className="flex items-center gap-1 text-xs text-ds-text-secondary"><Icon name="info" className="text-[14px]" />Não é possível alterar a categoria de um motivo após a confirmação do cadastro.</span>}
      </div>
      <Footer saving={saving} submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}

const toLocalInput = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Ação de venda: cliente/lead, título, data, duração, canal, equipe e descrição. */
export function SalesActionForm({ initial, submitLabel, onSubmit, onCancel, allowNext }: { initial?: SalesAction; submitLabel: string; onSubmit: (v: SalesActionInput, next: boolean) => Promise<void>; onCancel: () => void; allowNext?: boolean }) {
  const [client, setClient] = useState<{ id: string; name: string } | null>(initial?.personId ? { id: initial.personId, name: initial.personName } : null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(toLocalInput(initial?.actionDate));
  const [hours, setHours] = useState(initial ? Number(initial.durationHours).toFixed(2).replace(".", ":").replace(/^(\d+):(\d+)$/, (_, h, f) => `${String(h).padStart(2, "0")}:${String(Math.round((Number(f) / 100) * 60)).padStart(2, "0")}`) : "00:00");
  const [channel, setChannel] = useState(initial?.channel ?? "");
  const [team, setTeam] = useState(initial?.supportTeam ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(next: boolean) {
    if (!client) return setError("Selecione o cliente / lead.");
    if (!title.trim()) return setError("Informe o título da ação.");
    if (!channel) return setError("Selecione o canal de comunicação.");
    const [h, m] = hours.split(":").map(Number);
    setSaving(true); setError("");
    try {
      await onSubmit({ personId: client.id, title: title.trim(), actionDate: new Date(date).toISOString(), durationHours: (h || 0) + (m || 0) / 60, channel, supportTeam: team, description }, next);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); setSaving(false); }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(false); }} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5"><FieldLabel>Selecione o Cliente / Lead <span className="text-ds-danger">*</span></FieldLabel><ClientPicker value={client} onChange={(c) => { setClient(c); setError(""); }} /></label>
      <div className="grid gap-4 md:grid-cols-[1fr_220px_130px]">
        <label className="flex flex-col gap-1.5"><FieldLabel>Título <span className="text-ds-danger">*</span></FieldLabel><Input value={title} maxLength={200} placeholder="Insira o título da ação de venda" onChange={(e) => { setTitle(e.target.value); setError(""); }} /></label>
        <label className="flex flex-col gap-1.5"><FieldLabel>Data da Ação <span className="text-ds-danger">*</span></FieldLabel><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="flex flex-col gap-1.5"><FieldLabel>Duração (horas)</FieldLabel><Input value={hours} inputMode="numeric" placeholder="00:00" onChange={(e) => setHours(e.target.value.replace(/[^\d:]/g, "").slice(0, 5))} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5"><FieldLabel>Canal de Comunicação <span className="text-ds-danger">*</span></FieldLabel>
          <select value={channel} onChange={(e) => { setChannel(e.target.value); setError(""); }} className={selectClass}><option value="">Selecione...</option>{CHANNELS.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1.5"><FieldLabel>Equipe de Apoio</FieldLabel>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className={selectClass}><option value="">Selecione...</option>{SUPPORT_TEAMS.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5"><FieldLabel>Descrição</FieldLabel>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Descreva sobre a ação realizada" className="rounded-[10px] border border-ds-border bg-white px-3 py-2 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" />
      </label>
      {error && <p role="alert" className="text-sm text-ds-danger-text">{error}</p>}
      <Footer saving={saving} submitLabel={submitLabel} onCancel={onCancel} extra={allowNext && <Button type="button" variant="secondary" disabled={saving} onClick={() => void submit(true)}>Salvar e agendar próxima ação</Button>} />
    </form>
  );
}

export function ModelForm({ initial, submitLabel, onSubmit, onCancel }: { initial?: string; submitLabel: string; onSubmit: (description: string) => Promise<void>; onCancel: () => void }) {
  const [description, setDescription] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return setError("Informe a descrição do modelo.");
    setSaving(true); setError("");
    try { await onSubmit(description.trim()); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); setSaving(false); }
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5"><FieldLabel>Descrição <span className="text-ds-danger">*</span></FieldLabel>
        <Input autoFocus value={description} maxLength={200} error={!!error} placeholder="Insira a descrição do modelo" onChange={(e) => { setDescription(e.target.value); setError(""); }} />
        {error && <span role="alert" className="text-xs text-ds-danger-text">{error}</span>}
      </label>
      <Footer saving={saving} submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}
