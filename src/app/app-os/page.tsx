"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, authFetch, getMe, login, logout, type Me } from "@/lib/api";
import { requestLoginLocation } from "@/lib/login-location";

type Row = { id: string; number: number; status: number; typeLabel: string; client: string; reason: string | null; address: string; when: string | null };
type Detail = { id: string; number: number; status: number; typeLabel: string; reason: string | null; client: string; address: string; coordinate: { latitude?: number; longitude?: number } | null; contact: { name: string | null; phone: string | null }; notices: string[]; products: { name: string; qty: number }[]; services: { name: string; qty: number }[]; calls: number; openCall: boolean; openedAt: string; openedBy: string; scheduleStart: string | null; scheduleEnd: string | null };
type AppMe = Me & { appAccess?: boolean };

const BLUE = "#4B66A8";
const ORANGE = "#F7941D";
const STATUS: Record<number, { label: string; color: string }> = { 0: { label: "Aberta", color: "#12A262" }, 1: { label: "Aberta", color: "#12A262" }, 3: { label: "Interrompida", color: "#8A94A6" }, 7: { label: "Aguardando", color: "#8A94A6" }, 8: { label: "Em atendimento", color: ORANGE }, 2: { label: "Cancelada", color: "#D64545" }, 4: { label: "Fechada", color: "#2F6FDE" }, 5: { label: "Fechada", color: "#2F6FDE" }, 6: { label: "Fechada", color: "#2F6FDE" } };
const pad = (n: number) => String(n).padStart(2, "0");
const dm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const DOW = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível concluir.");
  return body as T;
}

const Ic = ({ n, className = "" }: { n: string; className?: string }) => <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{n}</span>;

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const location = await requestLoginLocation(); // pede a permissão de localização ao entrar
      await login(email.trim(), password, true, location);
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : "Falha ao entrar."); } finally { setBusy(false); }
  }
  return (
    <main className="flex min-h-dvh flex-col items-center justify-between bg-gradient-to-b from-[#6C86C4] via-[#4B66A8] to-[#2D4278] px-6 pb-8 pt-16 text-white">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col items-center">
        <img src="/teclive-logo-white.png" alt="Teclive" className="h-12 w-auto" />
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#FFB347]">gestão de os</p>
        <label className="mt-12 w-full text-sm font-semibold">E-mail
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border-0 bg-white px-4 py-3.5 text-base text-[#2B3445] outline-none" />
        </label>
        <label className="mt-4 w-full text-sm font-semibold">Senha
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border-0 bg-white px-4 py-3.5 text-base text-[#2B3445] outline-none" />
        </label>
        {error && <p role="alert" className="mt-4 w-full rounded-lg bg-red-500/20 px-3 py-2 text-sm">{error}</p>}
        <button type="submit" disabled={busy} className="mt-8 w-full rounded-full py-3.5 text-base font-bold shadow-lg disabled:opacity-60" style={{ background: ORANGE }}>{busy ? "Entrando…" : "Entrar"}</button>
        <p className="mt-4 text-center text-xs text-white/70">Ao entrar, permita o acesso à sua localização.</p>
      </form>
      <p className="text-xs text-white/60">Teclive Tecnologia</p>
    </main>
  );
}

function Header({ title, onBack, right }: { title?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow-md" style={{ background: BLUE }}>
      <div className="flex w-20 items-center">{onBack ? <button type="button" onClick={onBack} aria-label="Voltar" className="flex h-10 w-10 items-center justify-center rounded-full active:bg-white/20"><Ic n="arrow_back" /></button> : null}</div>
      {title ? <h1 className="text-lg font-semibold">{title}</h1> : <img src="/teclive-logo-white.png" alt="Teclive" className="h-7 w-auto" />}
      <div className="flex w-20 items-center justify-end gap-1">{right}</div>
    </header>
  );
}

const IconBtn = ({ n, label, onClick }: { n: string; label: string; onClick?: () => void }) => <button type="button" aria-label={label} onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-full active:bg-white/20"><Ic n={n} /></button>;

function List({ me, onOpen, onLogout }: { me: AppMe; onOpen: (id: string) => void; onLogout: () => void }) {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setRows(null); setError("");
    api<Row[]>(`/app-os/os?tab=${tab}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`).then(setRows).catch((e) => { setError(e instanceof Error ? e.message : "Erro ao carregar."); setRows([]); });
  }, [tab, q]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);
  const groups: { day: string; items: Row[] }[] = [];
  const today = new Date();
  for (const r of rows ?? []) {
    const d = r.when ? new Date(r.when) : null;
    const day = d ? `${d.toDateString() === today.toDateString() ? "Hoje" : DOW[d.getDay()]}, ${dm(d)}/${String(d.getFullYear()).slice(2)}` : "Sem data";
    const g = groups.find((x) => x.day === day);
    if (g) g.items.push(r); else groups.push({ day, items: [r] });
  }
  return (
    <>
      <Header onBack={undefined} right={<><IconBtn n="refresh" label="Atualizar" onClick={load} /><IconBtn n="person" label={`Sair (${me.name})`} onClick={onLogout} /></>} />
      <div className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20"><IconBtn n={search ? "close" : "search"} label="Buscar" onClick={() => { setSearch((s) => !s); if (search) setQ(""); }} /></div>
      {search && <div className="bg-white px-3 py-2 shadow"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por cliente, motivo ou nº da OS" className="w-full rounded-lg bg-[#F1F3F7] px-3 py-2.5 text-sm outline-none" /></div>}
      <nav className="flex bg-white shadow-sm" aria-label="Filtro">
        {(["pending", "history"] as const).map((t) => <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 border-b-[3px] py-3 text-sm font-semibold ${tab === t ? "text-[#2B3445]" : "border-transparent text-[#8A94A6]"}`} style={tab === t ? { borderColor: ORANGE } : undefined}>{t === "pending" ? "Pendentes" : "Histórico"}</button>)}
      </nav>
      <main className="px-3 pb-10 pt-3">
        {rows === null && <p className="py-10 text-center text-sm text-[#8A94A6]">Carregando…</p>}
        {rows !== null && error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {rows !== null && !error && rows.length === 0 && <p className="py-16 text-center text-sm text-[#8A94A6]">Nenhuma ordem encontrada.</p>}
        {groups.map((g) => (
          <section key={g.day} className="mb-4">
            <h2 className="mb-2 px-1 text-sm font-bold text-[#2B3445]">{g.day}</h2>
            <ul className="space-y-2">
              {g.items.map((r) => {
                const st = STATUS[r.status] ?? STATUS[0];
                return (
                  <li key={r.id}>
                    <button type="button" onClick={() => onOpen(r.id)} className="w-full rounded-xl bg-white p-3 text-left shadow-sm active:bg-[#F7F9FC]">
                      <div className="flex items-start justify-between gap-2"><b className="text-[15px] leading-tight">{r.client}</b><span className="shrink-0 text-xs text-[#8A94A6]">{r.when ? `${hm(new Date(r.when))}h` : ""}</span></div>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#4A5568]"><Ic n="build" className="text-[16px] text-[#8A94A6]" />{r.reason || r.typeLabel}</p>
                      {r.address && <p className="mt-1 flex items-start gap-1.5 text-[13px] text-[#4A5568]"><Ic n="location_on" className="text-[16px] text-[#8A94A6]" /><span>{r.address}</span></p>}
                      <div className="mt-2 flex items-center gap-2 text-xs"><span className="rounded-md bg-[#EEF1F6] px-2 py-0.5 font-semibold">OS {r.number}</span><span className="flex items-center gap-1 font-semibold" style={{ color: st.color }}><i className="h-2 w-2 rounded-full" style={{ background: st.color }} />{st.label}</span></div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [view, setView] = useState<"main" | "items">("main");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => { api<Detail>(`/app-os/os/${id}`).then(setD).catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar.")); }, [id]);
  useEffect(load, [load]);
  async function act(kind: "start" | "finish") {
    setBusy(true); setError("");
    try { await api(`/app-os/os/${id}/${kind}`, { method: "POST" }); load(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir."); } finally { setBusy(false); }
  }
  if (!d) return <><Header title="Ordem de Serviço" onBack={onBack} />{error ? <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : <p className="py-16 text-center text-sm text-[#8A94A6]">Carregando…</p>}</>;
  const st = STATUS[d.status] ?? STATUS[0];
  const right = <><IconBtn n="refresh" label="Atualizar" onClick={load} /><IconBtn n="notifications" label="Avisos" /></>;
  if (view === "items") {
    return (
      <>
        <Header title="Produtos e Serviços" onBack={() => setView("main")} right={right} />
        <main className="space-y-4 p-3">
          {([["Produtos", d.products], ["Serviços", d.services]] as const).map(([t, list]) => (
            <section key={t}><h2 className="mb-2 px-1 text-sm font-bold">{t}</h2>
              <ul className="divide-y divide-[#EEF1F6] rounded-xl bg-white shadow-sm">{list.length === 0 ? <li className="p-3 text-sm text-[#8A94A6]">Nenhum {t === "Produtos" ? "produto" : "serviço"}</li> : list.map((p, i) => <li key={i} className="flex justify-between gap-3 p-3 text-sm"><span>{p.name}</span><b>{p.qty}x</b></li>)}</ul>
            </section>
          ))}
        </main>
      </>
    );
  }
  const sch = d.scheduleStart ? new Date(d.scheduleStart) : null;
  const sce = d.scheduleEnd ? new Date(d.scheduleEnd) : null;
  const op = new Date(d.openedAt);
  const map = d.coordinate?.latitude !== undefined ? `https://www.google.com/maps?q=${d.coordinate.latitude},${d.coordinate.longitude}` : `https://www.google.com/maps?q=${encodeURIComponent(d.address)}`;
  const Row2 = ({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) => <button type="button" onClick={onClick} className="flex w-full items-center justify-between border-t border-[#EEF1F6] px-4 py-3 text-left"><span><b className="block text-sm">{label}</b><span className="text-sm text-[#8A94A6]">{value}</span></span><Ic n="chevron_right" className="text-[#8A94A6]" /></button>;
  return (
    <>
      <Header title="Ordem de Serviço" onBack={onBack} right={right} />
      <main className="pb-28">
        <div className="flex items-center justify-between px-4 py-3"><h2 className="text-base font-bold">#{String(d.number).padStart(6, "0")} {d.reason || d.typeLabel}</h2><span className="rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: st.color }}>{st.label}</span></div>
        <section className="mx-3 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="space-y-3 p-4 text-sm">
            <p><b className="block text-[13px] text-[#8A94A6]">Nome</b>{d.client}</p>
            <div className="flex items-start justify-between gap-3"><p><b className="block text-[13px] text-[#8A94A6]">Endereço</b>{d.address || "—"}</p><a href={map} target="_blank" rel="noopener noreferrer" aria-label="Abrir no mapa" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: BLUE }}><Ic n="map" /></a></div>
            <p><b className="block text-[13px] text-[#8A94A6]">Contato</b>{d.contact.phone ? <a href={`tel:${d.contact.phone}`} className="text-[#2F6FDE]">{d.contact.name} · {d.contact.phone}</a> : d.contact.name ?? "—"}</p>
            <div><b className="block text-[13px] text-[#8A94A6]">Avisos</b>{d.notices.length ? <ul className="list-disc pl-5">{d.notices.map((n, i) => <li key={i}>{n}</li>)}</ul> : "—"}</div>
          </div>
          <Row2 label="Produtos/Serviços" value={d.products.length + d.services.length === 0 ? "Nenhum produto/nenhum serviço" : `${d.products.length} produto(s) / ${d.services.length} serviço(s)`} onClick={() => setView("items")} />
          <Row2 label="Atendimentos" value={`${pad(d.calls)} atendimento${d.calls === 1 ? "" : "s"} registrado${d.calls === 1 ? "" : "s"}`} />
        </section>
        <p className="mt-4 px-5 text-xs text-[#6B7585]">Abertura {dm(op)} às {hm(op)} por {d.openedBy}</p>
        {sch && <p className="mt-1 px-5 text-xs text-[#6B7585]">Agendado para {dm(sch)} das {hm(sch)}{sce ? ` até ${hm(sce)}` : ""}</p>}
        {error && <p role="alert" className="mx-3 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </main>
      {[0, 1, 8].includes(d.status) && (
        <div className="fixed inset-x-0 bottom-0 z-10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" disabled={busy} onClick={() => act(d.openCall ? "finish" : "start")} className="w-full rounded-full py-4 text-base font-bold text-white shadow-lg disabled:opacity-60" style={{ background: d.openCall ? "#12A262" : ORANGE }}>{busy ? "Aguarde…" : d.openCall ? "Finalizar Atendimento" : "Iniciar Atendimento"}</button>
        </div>
      )}
    </>
  );
}

export default function AppOs() {
  const [me, setMe] = useState<AppMe | null | undefined>(undefined);
  const [open, setOpen] = useState<string | null>(null);
  const registered = useRef(false);
  const refresh = useCallback(() => { void getMe().then((m) => setMe(m as AppMe | null)); }, []);
  useEffect(() => {
    refresh();
    if (!registered.current && "serviceWorker" in navigator) { registered.current = true; void navigator.serviceWorker.register("/sw.js").catch(() => undefined); }
  }, [refresh]);
  if (me === undefined) return <div className="flex min-h-dvh items-center justify-center text-sm text-[#8A94A6]">Carregando…</div>;
  if (!me) return <Login onDone={refresh} />;
  const out = async () => { await logout().catch(() => undefined); setMe(null); };
  if (!me.appAccess) return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <Ic n="lock" className="text-5xl text-[#8A94A6]" /><p className="text-sm">O e-mail <b>{me.email}</b> não tem acesso ao aplicativo. Peça a um administrador para liberar em Controle de Acesso.</p>
      <button type="button" onClick={out} className="rounded-full px-6 py-3 text-sm font-bold text-white" style={{ background: BLUE }}>Sair</button>
    </main>
  );
  return open ? <Detail id={open} onBack={() => setOpen(null)} /> : <List me={me} onOpen={setOpen} onLogout={out} />;
}
