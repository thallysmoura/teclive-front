"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { FieldLabel, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { peopleClient } from "@/lib/cadastros";
import { getFilesUsage, getSetting, saveSetting } from "@/lib/settings";
import { defaultsOf, type Column, type Field, type Row, type Section } from "@/lib/settings-schema";

const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";
const fmtDateTime = (v: string) => new Date(v).toLocaleString("pt-BR", { timeZone: "America/Manaus", dateStyle: "short", timeStyle: "short" });
const bytes = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);

function PageHeader({ section, children }: { section: Section; children?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="flex items-center gap-3 text-xl font-bold text-ds-primary-deep"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ds-primary/10 text-ds-primary"><Icon name={section.icon} className="text-[22px]" /></span>{section.title}</h1>
      {children}
    </header>
  );
}

const Note = ({ ok, text }: { ok: boolean; text: string }) => <p role="status" className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${ok ? "bg-[#12A262]/10 text-[#0e8650]" : "bg-ds-danger-bg text-ds-danger-text"}`}><Icon name={ok ? "check_circle" : "error"} className="text-[18px]" />{text}</p>;

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="flex items-center gap-2.5">
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-[#12A262]" : "bg-ds-border"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} /></span>
      <span className={`text-sm font-semibold ${checked ? "text-[#0e8650]" : "text-ds-text-secondary"}`}>{checked ? "Ativo" : "Inativo"}</span>
    </button>
  );
}

function FieldInput({ f, value, onChange }: { f: Field; value: string | number | boolean; onChange: (v: string | number | boolean) => void }) {
  if (f.type === "toggle") return <Switch checked={!!value} onChange={onChange} label={f.label} />;
  if (f.type === "select") return <select className={selectClass} value={String(value)} onChange={(e) => onChange(e.target.value)} aria-label={f.label}>{!f.options?.includes(String(value)) && <option>{String(value)}</option>}{f.options?.map((o) => <option key={o}>{o}</option>)}</select>;
  if (f.type === "radio") return <div role="radiogroup" aria-label={f.label} className="flex flex-wrap gap-2">{f.options?.map((o) => <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${value === o ? "border-ds-primary-deep bg-ds-primary-deep text-white" : "border-ds-border text-ds-text-muted hover:border-ds-primary"}`}>{o}</button>)}</div>;
  if (f.type === "textarea") return <textarea value={String(value)} rows={4} onChange={(e) => onChange(e.target.value)} aria-label={f.label} className="w-full rounded-[10px] border border-ds-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" />;
  const input = <Input type={f.type === "password" ? "password" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} autoComplete={f.type === "password" ? "new-password" : "off"} value={String(value)} placeholder={f.placeholder} onChange={(e) => onChange(f.type === "number" ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value)} aria-label={f.label} className={f.suffix ? "pr-16" : ""} />;
  return f.suffix ? <div className="relative">{input}<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ds-text-secondary">{f.suffix}</span></div> : input;
}

/** Formulário de uma seção (carrega o salvo, mostra os padrões da conta e grava ao clicar em Salvar). */
function FormView({ section }: { section: Section }) {
  const defaults = useMemo(() => defaultsOf(section), [section]);
  const [values, setValues] = useState(defaults);
  const [saved, setSaved] = useState(defaults);
  const [meta, setMeta] = useState<{ by: string | null; at: string | null }>({ by: null, at: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    getSetting<Record<string, string | number | boolean>>(section.slug).then((s) => { const merged = { ...defaults, ...(s.value ?? {}) }; setValues(merged); setSaved(merged); setMeta({ by: s.updatedBy, at: s.updatedAt }); })
      .catch((e) => setNote({ ok: false, text: e instanceof Error ? e.message : "Não foi possível carregar." })).finally(() => setLoading(false));
  }, [section, defaults]);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setNote(null);
    try { const s = await saveSetting(section.slug, values); setSaved(values); setMeta({ by: s.updatedBy, at: s.updatedAt }); setNote({ ok: true, text: "Configurações salvas com sucesso." }); }
    catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : "Não foi possível salvar." }); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className={loading ? "opacity-60" : ""}>
      <PageHeader section={section} />
      <div className="space-y-4">
        {section.blocks?.map((b) => (
          <section key={b.title} className="overflow-hidden rounded-2xl border border-ds-border-subtle bg-white shadow-sm">
            {b.title && <h2 className="border-b border-ds-border-subtle bg-ds-bg/60 px-5 py-3 text-sm font-bold text-ds-primary-deep">{b.title}</h2>}
            {b.help && <p className="px-5 pt-4 text-sm text-ds-text-secondary">{b.help}</p>}
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 md:grid-cols-2">
              {b.fields.map((f) => (
                <div key={f.key} className={f.wide || f.type === "textarea" || f.type === "radio" ? "md:col-span-2" : ""}>
                  {f.type === "toggle" ? (
                    <div className="flex items-start justify-between gap-4 rounded-xl border border-ds-border-subtle px-4 py-3"><div className="min-w-0"><p className="text-sm font-semibold text-ds-text">{f.label}</p>{f.help && <p className="mt-0.5 text-xs text-ds-text-secondary">{f.help}</p>}</div><FieldInput f={f} value={values[f.key] ?? false} onChange={(v) => setValues((c) => ({ ...c, [f.key]: v }))} /></div>
                  ) : (
                    <label className="flex flex-col gap-1.5"><FieldLabel>{f.label}</FieldLabel><FieldInput f={f} value={values[f.key] ?? ""} onChange={(v) => setValues((c) => ({ ...c, [f.key]: v }))} />{f.help && <span className="text-xs text-ds-text-secondary">{f.help}</span>}</label>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="sticky bottom-0 z-10 mt-5 flex flex-wrap items-center gap-3 border-t border-ds-border-subtle bg-ds-bg/95 py-3 backdrop-blur">
        <Button type="submit" disabled={!dirty || saving || loading}>{saving ? "Salvando..." : "Salvar"}</Button>
        {dirty && <button type="button" onClick={() => { setValues(saved); setNote(null); }} className="text-sm font-semibold text-ds-primary hover:underline">Descartar alterações</button>}
        {note && <Note ok={note.ok} text={note.text} />}
        {meta.at && !note && <span className="ml-auto text-xs text-ds-text-secondary">Última alteração por {meta.by ?? "—"} em {fmtDateTime(meta.at)}</span>}
      </div>
    </form>
  );
}

/** Lista editável (operações de faturamento, ICMS, ISS): cada alteração é gravada na hora. */
function TableView({ section }: { section: Section }) {
  const columns = section.columns as Column[];
  const [rows, setRows] = useState<Row[]>(section.rows ?? []);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ index: number | null; row: Row } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { getSetting<{ rows: Row[] }>(section.slug).then((s) => { if (s.value?.rows) setRows(s.value.rows); }).catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar.")).finally(() => setLoading(false)); }, [section]);
  async function persist(next: Row[]) { setError(""); try { await saveSetting(section.slug, { rows: next }); setRows(next); return true; } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); return false; } }
  const blank = () => Object.fromEntries(columns.map((c) => [c.key, c.type === "select" ? c.options?.[0] ?? "" : c.type === "number" ? 0 : ""])) as Row;

  return (
    <div>
      <PageHeader section={section}><button type="button" onClick={() => setEditing({ index: null, row: blank() })} className="btn-add inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold text-white"><Icon name="add" className="text-[20px]" />{section.newLabel}</button></PageHeader>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      <div className={`ds-table-wrap ${loading ? "opacity-60" : ""}`}>
        <table className="ds-table">
          <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}<th className="text-center">Ações</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c, ci) => <td key={c.key} data-label={c.label} className={ci === 0 ? "ds-strong" : ""}>{c.key === "status" ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r[c.key] === "Ativo" ? "bg-ds-success/15 text-ds-success" : "bg-ds-border-subtle text-ds-text-muted"}`}>{String(r[c.key])}</span> : <>{String(r[c.key] ?? "") || "—"}{c.suffix && r[c.key] !== "" ? ` ${c.suffix}` : ""}</>}</td>)}
                <td data-label="Ações"><span className="flex items-center justify-end gap-2 md:justify-center">
                  <button type="button" onClick={() => setEditing({ index: i, row: { ...r } })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-ds-primary-deep px-2.5 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="edit" className="text-[15px]" />Editar</button>
                  <button type="button" aria-label="Excluir" onClick={() => { if (confirm("Excluir este registro?")) void persist(rows.filter((_, x) => x !== i)); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ds-danger text-white"><Icon name="delete" className="text-[16px]" /></button></span></td>
              </tr>
            ))}
            {rows.length === 0 && !loading && <tr><td colSpan={columns.length + 1} className="text-center">Nenhum registro.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ds-text-secondary">{rows.length} {rows.length === 1 ? "registro" : "registros"}</p>

      {editing && (
        <Modal open onClose={() => setEditing(null)} labelledBy="row-title">
          <form onSubmit={async (e) => { e.preventDefault(); const row = Object.fromEntries(columns.map((c) => [c.key, c.type === "number" ? Number(String(editing.row[c.key]).replace(",", ".")) || 0 : editing.row[c.key]])) as Row; const next = editing.index === null ? [...rows, row] : rows.map((r, i) => (i === editing.index ? row : r)); if (await persist(next)) setEditing(null); }} className="flex flex-col gap-4">
            <h2 id="row-title" className="text-lg font-bold text-ds-primary-deep">{editing.index === null ? section.newLabel : `Editando ${section.title}`}</h2>
            {columns.map((c, i) => (
              <label key={c.key} className="flex flex-col gap-1.5"><FieldLabel>{c.label}</FieldLabel>
                {c.type === "select" ? <select className={selectClass} value={String(editing.row[c.key])} onChange={(e) => setEditing({ ...editing, row: { ...editing.row, [c.key]: e.target.value } })}>{c.options?.map((o) => <option key={o}>{o}</option>)}</select>
                  : <Input autoFocus={i === 0} inputMode={c.type === "number" ? "decimal" : undefined} value={String(editing.row[c.key] ?? "")} onChange={(e) => setEditing({ ...editing, row: { ...editing.row, [c.key]: c.type === "number" ? e.target.value.replace(/[^\d.,]/g, "") : e.target.value } })} />}
              </label>
            ))}
            <div className="flex gap-3 border-t border-ds-border-subtle pt-4"><Button type="submit">Salvar</Button><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function InfoView({ section }: { section: Section }) {
  const [step, setStep] = useState(0);
  return (
    <div>
      <PageHeader section={section} />
      <section className="overflow-hidden rounded-2xl border border-ds-border-subtle bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-ds-border-subtle bg-ds-bg/60 px-5 py-3"><h2 className="flex-1 text-sm font-bold text-ds-primary-deep">{section.intro}</h2><span className="rounded-full bg-ds-warning/25 px-2.5 py-1 text-xs font-bold text-ds-warning-text">{section.status}</span></div>
        <ol className="flex gap-2 border-b border-ds-border-subtle px-5 py-3 text-xs font-semibold">{["Introdução", "Dados de credenciamento"].map((s, i) => <li key={s} className={`rounded-full px-3 py-1 ${i === step ? "bg-ds-primary-deep text-white" : "bg-ds-bg text-ds-text-secondary"}`}>{i + 1}. {s}</li>)}</ol>
        <div className="p-5">
          {step === 0 ? (
            <><ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{section.benefits?.map((b) => <li key={b} className="flex items-center gap-3 rounded-xl border border-ds-border-subtle p-4 text-sm font-medium text-ds-text"><Icon name="check_circle" className="text-[22px] text-ds-primary" />{b}</li>)}</ul>
              <div className="mt-5 flex justify-end"><Button type="button" onClick={() => setStep(1)}>Avançar</Button></div></>
          ) : (
            <><p className="text-sm text-ds-text-muted">Seu pedido de credenciamento está <strong>{section.status?.toLowerCase()}</strong>. Os dados cadastrais da empresa (CNPJ, razão social, endereço e contato) são usados no cadastro. Confira-os em <a href="/company" className="font-semibold text-ds-primary hover:underline">Dados da Empresa</a>.</p>
              <div className="mt-5 flex justify-between"><Button type="button" variant="secondary" onClick={() => setStep(0)}>Voltar</Button></div></>
          )}
        </div>
      </section>
    </div>
  );
}

function WalletView({ section }: { section: Section }) {
  const [rows, setRows] = useState<Row[]>(section.rows ?? []);
  const [showOff, setShowOff] = useState(false);
  useEffect(() => { getSetting<{ rows: Row[] }>(section.slug).then((s) => { if (s.value?.rows) setRows(s.value.rows); }).catch(() => {}); }, [section]);
  const shown = rows.filter((r) => showOff || r.ativa);
  async function toggleRow(i: number) { const next = rows.map((r, x) => (x === i ? { ...r, ativa: !r.ativa } : r)); setRows(next); await saveSetting(section.slug, { rows: next }).catch(() => setRows(rows)); }
  return (
    <div>
      <PageHeader section={section} />
      <section className="rounded-2xl border border-ds-border-subtle bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-bold text-ds-primary-deep">{section.intro}</h2><label className="flex cursor-pointer items-center gap-2 text-sm text-ds-text-muted"><input type="checkbox" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} />Exibir integrações desabilitadas</label></div>
        <ul className="space-y-2">{shown.map((r) => { const i = rows.indexOf(r); return <li key={String(r.conta)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ds-border-subtle px-4 py-3"><span className="flex items-center gap-3 text-sm font-semibold text-ds-primary-deep"><Icon name="account_balance" className="text-[22px] text-ds-primary" />Conta {String(r.conta)}{!r.ativa && <span className="rounded-full bg-ds-border-subtle px-2 py-0.5 text-[11px] font-bold text-ds-text-muted">Desabilitada</span>}</span><Switch checked={!!r.ativa} onChange={() => void toggleRow(i)} label={`Conta ${r.conta}`} /></li>; })}{shown.length === 0 && <li className="py-6 text-center text-sm text-ds-text-secondary">Nenhuma integração.</li>}</ul>
      </section>
    </div>
  );
}

function AppView({ section }: { section: Section }) {
  const [tab, setTab] = useState<"Usuários" | "Dispositivos" | "Configurações">("Usuários");
  const [techs, setTechs] = useState<{ id: string; name: string; email: string | null }[]>([]);
  useEffect(() => { peopleClient.list({ role: "isTechnician", page: 1 }).then((r) => setTechs(r.lista.map((p) => ({ id: p.id, name: p.name, email: p.email })))).catch(() => {}); }, []);
  return (
    <div>
      <PageHeader section={section} />
      <section className="overflow-hidden rounded-2xl border border-ds-border-subtle bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-ds-border-subtle px-5 py-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ds-primary-deep text-white"><Icon name="smartphone" className="text-[26px]" /></span><div className="min-w-0 flex-1"><h2 className="font-bold text-ds-primary-deep">EuGestor — Gestão de OS</h2><p className="text-sm text-ds-text-secondary">App para a gestão das equipes de atendimento</p></div>
          <span className="rounded-lg border border-ds-border px-3 py-1.5 text-xs font-semibold text-ds-text-muted">App Store</span><span className="rounded-lg border border-ds-border px-3 py-1.5 text-xs font-semibold text-ds-text-muted">Google Play</span></div>
        <div role="tablist" className="flex gap-1 border-b border-ds-border-subtle px-3 text-sm">{(["Usuários", "Dispositivos", "Configurações"] as const).map((t) => <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`border-b-2 px-4 py-2.5 font-medium ${tab === t ? "border-ds-primary-deep text-ds-primary-deep" : "border-transparent text-ds-text-muted"}`}>{t}</button>)}</div>
        <div className="p-5">
          {tab === "Usuários" && <ul className="divide-y divide-ds-border-subtle">{techs.map((t) => <li key={t.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-ds-primary-deep">{t.name}</span><span className="block truncate text-xs text-ds-text-secondary">Técnico{t.email ? ` · ${t.email}` : ""}</span></span><a href="/cadastros/pessoas" className="shrink-0 rounded-lg border border-ds-primary-deep px-3 py-1.5 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white">Alterar</a></li>)}{techs.length === 0 && <li className="py-6 text-center text-sm text-ds-text-secondary">Nenhum técnico cadastrado.</li>}</ul>}
          {tab === "Dispositivos" && <p className="py-6 text-center text-sm text-ds-text-secondary">Nenhum dispositivo conectado ao aplicativo até agora.</p>}
          {tab === "Configurações" && <p className="text-sm text-ds-text-muted">O fechamento de OS pelo aplicativo é controlado em <a href="/configuracoes/operacional" className="font-semibold text-ds-primary hover:underline">Setores › Operacional</a>.</p>}
        </div>
      </section>
    </div>
  );
}

function MonitoringView({ section }: { section: Section }) {
  return (
    <div>
      <PageHeader section={section} />
      <section className="rounded-2xl border border-ds-border-subtle bg-white p-5 shadow-sm"><h2 className="mb-4 text-sm font-bold text-ds-primary-deep">Integrações com Sistemas de Monitoramento</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">{["Moni", "Remoty", "Sigma Cloud"].map((n) => <li key={n} className="flex flex-col items-start gap-3 rounded-xl border border-ds-border-subtle p-4"><span className="flex items-center gap-2 font-bold text-ds-primary-deep"><Icon name="videocam" className="text-[20px] text-ds-primary" />{n}</span><span className="rounded-full bg-ds-border-subtle px-2 py-0.5 text-[11px] font-bold text-ds-text-muted">Não integrado</span><span className="mt-auto rounded-lg border border-ds-primary-deep px-3 py-1.5 text-xs font-semibold text-ds-primary-deep opacity-60">Realizar Integração</span></li>)}</ul>
      </section>
    </div>
  );
}

function FilesView({ section }: { section: Section }) {
  const [data, setData] = useState<{ label: string; count: number; bytes: number }[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getFilesUsage().then((r) => setData(r.groups)).catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar.")); }, []);
  const total = (data ?? []).reduce((s, g) => s + g.bytes, 0);
  return (
    <div>
      <PageHeader section={section} />
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      <section className="rounded-2xl border border-ds-border-subtle bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm text-ds-text-secondary">Espaço ocupado pelos arquivos guardados no sistema: <strong className="text-ds-primary-deep">{bytes(total)}</strong> no total.</p>
        <ul className="space-y-3">{(data ?? []).map((g) => <li key={g.label}><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-ds-text-muted">{g.label} <span className="text-ds-text-secondary">({g.count} {g.count === 1 ? "arquivo" : "arquivos"})</span></span><strong className="text-ds-primary-deep">{bytes(g.bytes)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-ds-bg"><div className="h-full rounded-full bg-ds-primary" style={{ width: `${total ? (g.bytes / total) * 100 : 0}%` }} /></div></li>)}{!data && !error && <li className="text-sm text-ds-text-secondary">Carregando...</li>}</ul>
      </section>
    </div>
  );
}

export function SectionView({ section }: { section: Section }) {
  switch (section.kind) {
    case "form": return <FormView section={section} />;
    case "table": return <TableView section={section} />;
    case "info": return <InfoView section={section} />;
    case "wallet": return <WalletView section={section} />;
    case "app": return <AppView section={section} />;
    case "monitoring": return <MonitoringView section={section} />;
    case "files": return <FilesView section={section} />;
  }
}
