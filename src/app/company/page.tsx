"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCompanyProfile, getMe, logout, saveCompanyProfile, type Me } from "@/lib/api";
import { companyToForm, EMPTY_COMPANY, formatCnpj, lookupPostalCode, type CompanyForm } from "@/lib/company";
import { Sidebar } from "@/components/layout/sidebar";
import { FullScreenSpinner } from "@/components/ui/spinner";
import { Input, FieldLabel } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type TextKey = Exclude<keyof CompanyForm, "accountantEnabled">;
const STATES = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
const SELECT_CLASS = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-base text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/15 sm:text-sm disabled:bg-ds-bg";

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-ds-border-subtle bg-white p-4 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-ds-border-subtle pb-4"><h2 className="flex items-center gap-2 text-base font-bold text-ds-primary-deep"><Icon name={icon} className="text-[20px] text-ds-primary" />{title}</h2></div>{children}</section>;
}

export default function CompanyPage() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CompanyForm>({ ...EMPTY_COMPANY });
  const [original, setOriginal] = useState<CompanyForm>({ ...EMPTY_COMPANY });
  const [saving, setSaving] = useState(false);
  const [lookup, setLookup] = useState<"cep" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let disposed = false;
    void getMe().then(async (me) => {
      if (disposed) return;
      if (!me) { router.replace("/login"); return; }
      setUser(me);
      if (me.role === "ADMIN" || me.permissions.includes("dados_empresa")) {
        const profile = await getCompanyProfile();
        if (!disposed) { const value = companyToForm(profile); setForm(value); setOriginal(value); setLoaded(true); }
      }
    }).catch(() => { if (!disposed) setError("Não foi possível carregar os dados da empresa. Recarregue a página."); }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [router]);
  const busy = saving || lookup !== null;
  const canEdit = user?.role === "ADMIN";
  const canView = canEdit || user?.permissions.includes("dados_empresa");
  const dirty = JSON.stringify(form) !== JSON.stringify(original);
  function change<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) { setForm((previous) => ({ ...previous, [key]: value })); setSaved(false); setError(null); }
  function field(key: TextKey, label: string, options: { required?: boolean; type?: string; maxLength?: number; placeholder?: string; className?: string } = {}) {
    return <label className={`flex min-w-0 flex-col gap-1.5 ${options.className ?? ""}`}><FieldLabel>{label}{options.required ? " *" : ""}</FieldLabel><Input name={key} value={key === "cnpj" ? formatCnpj(form[key]) : form[key]} type={options.type ?? "text"} maxLength={options.maxLength ?? 160} required={options.required} placeholder={options.placeholder} disabled={busy || !loaded} onChange={(event) => change(key, key === "cnpj" ? event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 14) : event.target.value)} /></label>;
  }
  async function consult() {
    if (busy || !canEdit) return;
    setLookup("cep"); setError(null); setSaved(false);
    try { const result = await lookupPostalCode(form.postalCode); setForm((previous) => ({ ...previous, ...result })); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Consulta indisponível. Preencha manualmente."); }
    finally { setLookup(null); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy || !loaded || !canEdit) return;
    setSaving(true); setError(null); setSaved(false);
    try { const result = await saveCompanyProfile(form); const value = companyToForm(result); setForm(value); setOriginal(value); setSaved(true); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }
  async function handleLogout() { await logout(); router.replace("/login"); }
  if (loading) return <FullScreenSpinner />;
  if (!user) return <p role="alert" className="p-6 text-ds-danger-text">{error ?? "Sessão expirada."}</p>;

  return <div className="flex min-h-screen bg-ds-bg"><Sidebar user={user} onLogout={handleLogout} />
    {!canView ? <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"><Icon name="lock" className="text-[36px] text-ds-text-secondary" /><h1 className="text-xl font-bold text-ds-primary-deep">Acesso restrito</h1><p className="text-sm text-ds-text-secondary">Peça a um administrador para liberar o acesso aos dados da empresa.</p></div> : <main className="min-w-0 flex-1 px-4 pb-8 pt-20 md:px-8 md:pt-10"><div className="mx-auto w-full max-w-[1200px]">
      <header className="mb-6"><h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-ds-primary-deep sm:text-[34px]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ds-primary/10 text-ds-primary"><Icon name="business" className="text-[24px]" /></span>Dados da empresa</h1><p className="mt-2 text-sm leading-relaxed text-ds-text-secondary">Cadastro, endereço e dados tributários.</p></header>
      {error && <p role="alert" className="mb-4 rounded-xl border border-ds-danger-border bg-ds-danger-bg p-4 text-sm text-ds-danger-text">{error}</p>}
      {saved && <p role="status" className="mb-4 rounded-xl border border-ds-success/20 bg-ds-success/10 p-4 text-sm font-medium text-ds-success">Dados da empresa salvos.</p>}
      {!canEdit && <p className="mb-4 text-sm text-ds-text-secondary">Somente leitura. A edição é exclusiva de administradores.</p>}
      <form onSubmit={save}><fieldset disabled={!canEdit} className="min-w-0 space-y-5">
        <Section title="Dados básicos" icon="domain">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 sm:max-w-sm">{field("cnpj", "CNPJ", { required: true, maxLength: 18, placeholder: "00.000.000/0000-00" })}</div>
            {field("legalName", "Razão social", { required: true })}{field("tradeName", "Nome fantasia")}{field("email", "E-mail", { type: "email", maxLength: 254 })}{field("phone", "Telefone", { type: "tel", maxLength: 20, placeholder: "(00) 00000-0000" })}
          </div>
        </Section>
        <Section title="Endereço" icon="location_on">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="sm:col-span-2 lg:col-span-6"><div className="flex flex-wrap items-end gap-2"><div className="min-w-0 flex-1 sm:max-w-52">{field("postalCode", "CEP", { required: true, maxLength: 9, placeholder: "00000-000" })}</div><Button type="button" variant="secondary" disabled={busy || !loaded} onClick={() => { void consult(); }}>{lookup === "cep" ? "Consultando..." : "Buscar CEP"}</Button></div></div>
            {field("street", "Endereço", { required: true, className: "lg:col-span-4" })}{field("number", "Número", { required: true, maxLength: 20, className: "lg:col-span-2" })}{field("district", "Bairro", { required: true, maxLength: 100, className: "lg:col-span-3" })}{field("complement", "Complemento", { className: "lg:col-span-3" })}{field("city", "Cidade", { required: true, maxLength: 100, className: "lg:col-span-4" })}
            <label className="flex flex-col gap-1.5 lg:col-span-2"><FieldLabel>UF *</FieldLabel><select name="state" value={form.state} required disabled={busy || !loaded} onChange={(event) => change("state", event.target.value)} className={SELECT_CLASS}><option value="">Selecione</option>{STATES.map((state) => <option key={state}>{state}</option>)}</select></label>
          </div>
        </Section>
        <Section title="Dados tributários" icon="receipt_long"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field("municipalRegistration", "Inscrição municipal", { maxLength: 40 })}{field("stateRegistration", "Inscrição estadual", { maxLength: 40 })}{field("substituteRegistration", "Inscrição estadual ST", { maxLength: 40 })}
          <label className="flex flex-col gap-1.5 lg:col-span-2"><FieldLabel>Regime tributário *</FieldLabel><select name="taxRegime" required value={form.taxRegime} disabled={busy || !loaded} onChange={(event) => change("taxRegime", event.target.value)} className={SELECT_CLASS}><option value="">Selecione</option>{[["SIMPLES_NACIONAL", "Simples Nacional"], ["MEI", "MEI"], ["LUCRO_PRESUMIDO", "Lucro Presumido"], ["LUCRO_REAL", "Lucro Real"], ["OUTRO", "Outro"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {field("cnae", "CNAE", { maxLength: 9, placeholder: "0000000" })}
        </div></Section>
        {dirty && <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ds-border-subtle bg-white/95 p-4 backdrop-blur-sm"><p className="text-xs text-ds-text-secondary">Alterações não salvas</p><div className="flex gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={() => { setForm(original); setError(null); setSaved(false); }}>Descartar</Button><Button type="submit" disabled={busy || !loaded}>{saving ? "Salvando..." : "Salvar alterações"}</Button></div></footer>}
      </fieldset></form>
    </div></main>}
  </div>;
}
