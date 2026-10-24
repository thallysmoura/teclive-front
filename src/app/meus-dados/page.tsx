"use client";

import { useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { FieldLabel, Input } from "@/components/ui/input";
import { changeMyPassword, getMe, updateMyProfile, type Me } from "@/lib/api";
import { formatPhone } from "@/lib/company";

type Note = { ok: boolean; text: string } | null;

function Profile({ user }: { user: Me }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Note>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<Note>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(null);
    try { await updateMyProfile({ name, phone: phone.replace(/\D/g, "") }); await getMe(); setMessage({ ok: true, text: "Dados salvos com sucesso." }); }
    catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Não foi possível salvar." }); }
    finally { setSaving(false); }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (pw.next !== pw.confirm) { setPwMessage({ ok: false, text: "A confirmação não confere com a nova senha." }); return; }
    setPwSaving(true); setPwMessage(null);
    try { await changeMyPassword({ currentPassword: pw.current, newPassword: pw.next }); setPw({ current: "", next: "", confirm: "" }); setPwMessage({ ok: true, text: "Senha alterada com sucesso." }); }
    catch (error) { setPwMessage({ ok: false, text: error instanceof Error ? error.message : "Não foi possível alterar a senha." }); }
    finally { setPwSaving(false); }
  }

  const note = (m: Note) => m && <p role="status" className={`text-sm font-medium ${m.ok ? "text-[#0e8650]" : "text-ds-danger"}`}>{m.text}</p>;

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Meus Dados" }]} />
      <h1 className="mb-6 flex items-center gap-3 text-2xl font-bold text-ds-primary-deep"><Icon name="person" className="!text-[32px]" />Meus Dados</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={save} className="space-y-5 rounded-xl border border-ds-border-subtle bg-white p-5">
          <label className="flex flex-col gap-1.5"><FieldLabel>E-mail (utilizado como login)</FieldLabel><Input value={user.email} readOnly disabled className="bg-ds-bg" /></label>
          <label className="flex flex-col gap-1.5"><FieldLabel>Nome *</FieldLabel><Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} /></label>
          <label className="flex flex-col gap-1.5"><FieldLabel>Telefone (opcional)</FieldLabel><Input inputMode="tel" value={formatPhone(phone)} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="(00) 00000-0000" /></label>
          <div className="flex items-center gap-4 border-t border-ds-border-subtle pt-5">
            <button type="submit" disabled={saving} className="btn-add rounded-lg px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
            {note(message)}
          </div>
        </form>

        <aside className="self-start rounded-xl border border-ds-border-subtle bg-white">
          <button type="button" onClick={() => setPwOpen((v) => !v)} aria-expanded={pwOpen} className="flex w-full items-center gap-2 px-5 py-4 text-left text-sm font-bold text-ds-primary-deep"><Icon name="lock" className="text-[18px]" />Alterar Senha<Icon name={pwOpen ? "expand_less" : "expand_more"} className="ml-auto" /></button>
          {pwOpen && (
            <form onSubmit={savePassword} className="space-y-4 border-t border-ds-border-subtle p-5">
              <label className="flex flex-col gap-1.5"><FieldLabel>Senha atual</FieldLabel><Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></label>
              <label className="flex flex-col gap-1.5"><FieldLabel>Nova senha</FieldLabel><Input type="password" autoComplete="new-password" minLength={6} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></label>
              <label className="flex flex-col gap-1.5"><FieldLabel>Confirmar nova senha</FieldLabel><Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></label>
              <button type="submit" disabled={pwSaving} className="btn-add rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{pwSaving ? "Salvando..." : "Alterar senha"}</button>
              {note(pwMessage)}
            </form>
          )}
        </aside>
      </div>
    </>
  );
}

export default function MyDataPage() {
  return <PageShell permissionKey={null}>{(user) => <Profile user={user} />}</PageShell>;
}
