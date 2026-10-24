"use client";

import { useEffect, useState } from "react";
import { ClientPicker } from "@/components/comercial/client-picker";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { OS_TYPES, fromLocalInput, opOptions, osClient, toLocalInput, type OsDetail, type OsOptions } from "@/lib/operacional";

const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";

/** Abre uma OS nova ou edita os dados de uma OS aberta. */
export function OsFormModal({ os, onClose, onSaved }: { os: OsDetail | null; onClose: () => void; onSaved: (os: OsDetail) => void }) {
  const [options, setOptions] = useState<OsOptions | null>(null);
  const [person, setPerson] = useState<{ id: string; name: string } | null>(os?.personId ? { id: os.personId, name: os.personName } : null);
  const [type, setType] = useState(os?.type ?? 1);
  const [defect, setDefect] = useState(os?.defect ?? "");
  const [start, setStart] = useState(toLocalInput(os?.scheduleStart));
  const [end, setEnd] = useState(toLocalInput(os?.scheduleEnd));
  const [techs, setTechs] = useState<string[]>(os?.technicians ?? []);
  const [sheet, setSheet] = useState(os?.technicalSheet ?? "");
  const [addr, setAddr] = useState({ titulo: os?.address?.titulo ?? "", logradouro: os?.address?.logradouro ?? "", numero: os?.address?.numero ?? "", bairro: os?.address?.bairro ?? "", cidade: os?.address?.cidade ?? "Manaus", uf: os?.address?.uf ?? "AM", cep: os?.address?.cep ?? "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { opOptions().then(setOptions).catch(() => {}); }, []);

  function pickDefect(name: string) {
    setDefect(name);
    const d = options?.defects.find((x) => x.description === name);
    if (d && start && !os) setEnd(toLocalInput(new Date(new Date(fromLocalInput(start) ?? Date.now()).getTime() + d.closingMinutes * 60000).toISOString()));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!os && !person) return setError("Informe o cliente.");
    if (start && end && end < start) return setError("A previsão de fechamento deve ser depois do atendimento.");
    setSaving(true); setError("");
    try {
      const input = { type, defectName: defect, scheduleStart: fromLocalInput(start), scheduleEnd: fromLocalInput(end), technicians: techs, technicalSheet: sheet, address: addr };
      onSaved(os ? await osClient.update(os.id, input) : await osClient.create({ ...input, personId: person!.id }));
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); setSaving(false); }
  }

  const toggle = (name: string) => setTechs((t) => (t.includes(name) ? t.filter((x) => x !== name) : [...t, name]));
  const field = (k: keyof typeof addr, label: string, extra = "") => <label className={`flex flex-col gap-1.5 ${extra}`}><FieldLabel>{label}</FieldLabel><Input value={addr[k]} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} maxLength={120} /></label>;

  return (
    <Modal open onClose={onClose} wide labelledBy="os-form-title">
      <form onSubmit={submit} noValidate className="flex max-h-[92vh] flex-col overflow-hidden">
        <header className="bg-ds-primary-deep px-5 py-3 text-sm font-bold text-white" id="os-form-title">{os ? `Editando OS` : "Nova Ordem de Serviço"}</header>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><FieldLabel>Cliente {!os && <span className="text-ds-danger">*</span>}</FieldLabel>{os ? <p className="mt-1.5 rounded-[10px] border border-ds-border bg-ds-bg px-3.5 py-2.5 text-sm">{os.personName}</p> : <div className="mt-1.5"><ClientPicker value={person} onChange={(o) => setPerson(o ? { id: o.id, name: o.name } : null)} placeholder="Selecione o cliente..." /></div>}</div>
          <label className="flex flex-col gap-1.5"><FieldLabel>Tipo de OS</FieldLabel><select className={selectClass} value={type} onChange={(e) => setType(Number(e.target.value))}>{Object.entries(OS_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="flex flex-col gap-1.5"><FieldLabel>Motivo / Defeito</FieldLabel><select className={selectClass} value={defect} onChange={(e) => pickDefect(e.target.value)}><option value="">Não informado</option>{os?.defect && !options?.defects.some((d) => d.description === os.defect) && <option>{os.defect}</option>}{options?.defects.map((d) => <option key={d.description}>{d.description}</option>)}</select></label>
          <label className="flex flex-col gap-1.5"><FieldLabel>Previsão de atendimento</FieldLabel><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="flex flex-col gap-1.5"><FieldLabel>Previsão de fechamento</FieldLabel><Input type="datetime-local" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} /></label>
          <fieldset className="sm:col-span-2"><legend className="mb-1.5"><FieldLabel>Equipe técnica</FieldLabel></legend>
            <div className="flex flex-wrap gap-2">{(options?.technicians ?? []).map((t) => <label key={t} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${techs.includes(t) ? "border-ds-primary-deep bg-ds-primary-deep text-white" : "border-ds-border text-ds-text-muted hover:border-ds-primary"}`}><input type="checkbox" className="sr-only" checked={techs.includes(t)} onChange={() => toggle(t)} />{t}</label>)}{options && !options.technicians.length && <span className="text-sm text-ds-text-secondary">Nenhum técnico cadastrado.</span>}</div></fieldset>
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-6">
            {field("titulo", "Nome do local", "sm:col-span-6")}{field("logradouro", "Logradouro", "sm:col-span-4")}{field("numero", "Número", "sm:col-span-2")}
            {field("bairro", "Bairro", "sm:col-span-2")}{field("cidade", "Cidade", "sm:col-span-2")}{field("uf", "UF", "sm:col-span-1")}{field("cep", "CEP", "sm:col-span-1")}
          </div>
          <label className="flex flex-col gap-1.5 sm:col-span-2"><FieldLabel>Ficha técnica / descrição</FieldLabel><textarea value={sheet} onChange={(e) => setSheet(e.target.value)} rows={5} className="rounded-[10px] border border-ds-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" /></label>
          {error && <p role="alert" className="text-sm text-ds-danger-text sm:col-span-2">{error}</p>}
        </div>
        <div className="flex gap-3 border-t border-ds-border-subtle p-4"><Button type="submit" disabled={saving}>{saving ? "Salvando..." : os ? "Salvar Alteração" : "Abrir OS"}</Button><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button></div>
      </form>
    </Modal>
  );
}
