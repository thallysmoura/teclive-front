"use client";

import { useMemo, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Icon } from "@/components/ui/icon";
import { FieldLabel, Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import { changeMyPassword, getMe, updateMyProfile, type Me } from "@/lib/api";
import { formatPhone } from "@/lib/company";

type Note = { ok: boolean; text: string } | null;

function Feedback({ note }: { note: Note }) {
  if (!note) return null;
  return (
    <p role="status" className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${note.ok ? "bg-[#12A262]/10 text-[#0e8650]" : "bg-ds-danger/10 text-ds-danger"}`}>
      <Icon name={note.ok ? "check_circle" : "error"} className="text-[18px]" />{note.text}
    </p>
  );
}

function Card({ icon, title, hint, children }: { icon: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-ds-border-subtle bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-ds-border-subtle px-6 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ds-primary/10 text-ds-primary"><Icon name={icon} className="!text-[22px]" /></span>
        <div><h2 className="text-base font-bold text-ds-primary-deep">{title}</h2><p className="text-xs text-ds-text-secondary">{hint}</p></div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function strength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
}
const LEVELS = [
  { label: "Muito fraca", color: "#E14337" },
  { label: "Fraca", color: "#E14337" },
  { label: "Razoável", color: "#F59E0B" },
  { label: "Boa", color: "#12A262" },
  { label: "Forte", color: "#12A262" },
];

function PasswordField({ label, value, onChange, autoComplete, error, hint }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; error?: boolean; hint?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <Input type={shown ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} required error={error} className="pr-11" />
        <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ds-text-secondary hover:bg-ds-bg hover:text-ds-primary"><Icon name={shown ? "visibility_off" : "visibility"} className="text-[20px]" /></button>
      </div>
      {hint && <span className="text-xs text-ds-text-secondary">{hint}</span>}
    </label>
  );
}

function Profile({ user }: { user: Me }) {
  const initialPhone = user.phone ?? "";
  const [saved, setSaved] = useState({ name: user.name, phone: initialPhone });
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Note>(null);
  const dirty = name.trim() !== saved.name || phone !== saved.phone;

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<Note>(null);
  const score = useMemo(() => strength(pw.next), [pw.next]);
  const mismatch = pw.confirm.length > 0 && pw.next !== pw.confirm;
  const pwReady = pw.current && pw.next.length >= 6 && pw.next === pw.confirm;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(null);
    try {
      await updateMyProfile({ name, phone });
      await getMe();
      setSaved({ name: name.trim().replace(/\s+/g, " "), phone });
      setName(name.trim().replace(/\s+/g, " "));
      setMessage({ ok: true, text: "Dados salvos com sucesso." });
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Não foi possível salvar." }); }
    finally { setSaving(false); }
  }

  function discard() { setName(saved.name); setPhone(saved.phone); setMessage(null); }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setPwSaving(true); setPwMessage(null);
    try {
      await changeMyPassword({ currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      setPwMessage({ ok: true, text: "Senha alterada com sucesso." });
    } catch (error) { setPwMessage({ ok: false, text: error instanceof Error ? error.message : "Não foi possível alterar a senha." }); }
    finally { setPwSaving(false); }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Configurações", href: "/configuracoes" }, { label: "Meus Dados" }]} />

      <header className="mb-6 flex flex-wrap items-center gap-5 rounded-2xl bg-gradient-to-r from-ds-primary-deep to-ds-primary p-6 text-white shadow-sm">
        <div className="scale-150 p-2"><UserAvatar name={user.name} avatarUrl={user.avatarUrl} presence="online" /></div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{saved.name}</h1>
          <p className="truncate text-sm text-white/80">{user.email}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider"><Icon name={user.role === "ADMIN" ? "admin_panel_settings" : "person"} className="text-[16px]" />{user.role === "ADMIN" ? "Administrador" : "Usuário"}</span>
        </div>
      </header>

      <div className="space-y-6">
        <Card icon="badge" title="Informações pessoais" hint="Mantenha seu nome e telefone atualizados.">
          <form onSubmit={save} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <FieldLabel>E-mail (usado para entrar)</FieldLabel>
                <div className="relative">
                  <Icon name="lock" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" />
                  <Input value={user.email} readOnly disabled className="bg-ds-bg pl-10" />
                </div>
                <span className="text-xs text-ds-text-secondary">Para alterar o e-mail, fale com um administrador.</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Nome completo *</FieldLabel>
                <div className="relative">
                  <Icon name="person" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" />
                  <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} className="pl-10" />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>Telefone (opcional)</FieldLabel>
                <div className="relative">
                  <Icon name="call" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" />
                  <Input inputMode="tel" value={formatPhone(phone)} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="(00) 00000-0000" className="pl-10" />
                </div>
              </label>
            </div>
            <Feedback note={message} />
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ds-border-subtle pt-5">
              {dirty && <span className="mr-auto text-xs font-medium text-ds-warning-text">Você tem alterações não salvas.</span>}
              <button type="button" onClick={discard} disabled={!dirty || saving} className="rounded-lg border border-ds-border px-5 py-2.5 text-sm font-semibold text-ds-text-muted hover:border-ds-primary hover:text-ds-primary disabled:opacity-40">Descartar</button>
              <button type="submit" disabled={!dirty || saving} className="btn-add rounded-lg px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar alterações"}</button>
            </div>
          </form>
        </Card>

        <Card icon="shield_lock" title="Segurança" hint="Altere sua senha periodicamente para manter a conta protegida.">
          <form onSubmit={savePassword} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><PasswordField label="Senha atual" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} autoComplete="current-password" /></div>
              <div>
                <PasswordField label="Nova senha" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} autoComplete="new-password" hint="Mínimo de 6 caracteres. Misture letras, números e símbolos." />
                {pw.next && (
                  <div className="mt-2" aria-live="polite">
                    <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: i < score ? LEVELS[score].color : "#E2E8F0" }} />)}</div>
                    <p className="mt-1 text-xs font-semibold" style={{ color: LEVELS[score].color }}>Força: {LEVELS[score].label}</p>
                  </div>
                )}
              </div>
              <PasswordField label="Confirmar nova senha" value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} autoComplete="new-password" error={mismatch} hint={mismatch ? "As senhas não conferem." : undefined} />
            </div>
            <Feedback note={pwMessage} />
            <div className="flex justify-end border-t border-ds-border-subtle pt-5">
              <button type="submit" disabled={!pwReady || pwSaving} className="btn-add rounded-lg px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{pwSaving ? "Alterando..." : "Alterar senha"}</button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function MyDataPage() {
  return <PageShell permissionKey={null}>{(user) => <SettingsShell active="meus-dados" admin={user.role === "ADMIN"}><Profile user={user} /></SettingsShell>}</PageShell>;
}
