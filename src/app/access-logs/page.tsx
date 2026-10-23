"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, listAccessLogs, logout, type AccessLog, type AccessLogsPage, type Me } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { FullScreenSpinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AccessLocationMap } from "@/components/ui/access-location-map";
import { ListFilters } from "@/components/ui/list-filters";
import { dateBounds, EMPTY_FILTERS, type ListFilters as Filters } from "@/lib/list-filters";

const locationLabels = { not_requested: "Localização não compartilhada", denied: "Localização não autorizada", unavailable: "Localização indisponível", shared: "Localização compartilhada" };
const place = (log: AccessLog) => [log.city, log.region, log.country].filter(Boolean).join(", ") || "Localização informada pelo dispositivo";
const date = (value: string) => new Date(value).toLocaleDateString("pt-BR");
const time = (value: string) => new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const hasLocation = (log: AccessLog) => log.locationStatus === "shared" && log.latitude !== null && log.longitude !== null;

function LoginStatus({ status }: { status: AccessLog["status"] }) {
  const valid = status === "VALID";
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${valid ? "bg-ds-success/10 text-ds-success" : "bg-ds-danger-bg text-ds-danger-text"}`}><Icon name={valid ? "check_circle" : "cancel"} className="text-[15px]" />Login {valid ? "válido" : "inválido"}</span>;
}

function LogEntry({ log, onMap }: { log: AccessLog; onMap: () => void }) {
  return <article aria-label={`Acesso de ${log.userName} em ${date(log.createdAt)} às ${time(log.createdAt)}`} className="overflow-hidden rounded-2xl border border-ds-border-subtle bg-white">
    <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3"><UserAvatar name={log.userName} avatarUrl={log.avatarUrl} size={48} /><div className="min-w-0"><h2 className="break-words text-base font-bold text-ds-primary-deep">{log.userName}</h2><p className="mt-0.5 break-words text-xs leading-relaxed text-ds-text-secondary">{log.userEmail}</p></div></div>
          <LoginStatus status={log.status} />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-ds-border-subtle pt-5 text-sm">
          <div><dt className="mb-1 flex items-center gap-1.5 text-xs text-ds-text-secondary"><Icon name="schedule" className="text-[16px]" />Data e hora</dt><dd className="font-semibold tabular-nums text-ds-text">{date(log.createdAt)} <span className="font-normal text-ds-text-secondary">às</span> {time(log.createdAt)}</dd></div>
          <div><dt className="mb-1 flex items-center gap-1.5 text-xs text-ds-text-secondary"><Icon name={log.device === "mobile" ? "smartphone" : "desktop_windows"} className="text-[16px]" />Dispositivo</dt><dd className="font-medium text-ds-text">{log.device === "mobile" ? "Mobile" : "Desktop"}</dd></div>
          <div><dt className="mb-1 text-xs text-ds-text-secondary">Resultado</dt><dd className={`text-xs font-medium ${log.status === "VALID" ? "text-ds-text-muted" : "text-ds-danger-text"}`}>{log.status === "VALID" ? "Acesso autorizado" : "Credenciais inválidas"}</dd></div>
        </dl>
      </div>
      <div className="border-t border-ds-border-subtle bg-ds-bg/50 p-4 lg:border-l lg:border-t-0">
        {hasLocation(log) ? <>
          <div className="mb-2 flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-xs font-semibold text-ds-primary-deep"><Icon name="location_on" className="text-[16px]" />Localização do acesso</span><button type="button" onClick={onMap} aria-label={`Ampliar mapa do acesso de ${log.userName}`} className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary"><Icon name="open_in_full" className="text-[14px]" />Ampliar</button></div>
          <AccessLocationMap latitude={log.latitude!} longitude={log.longitude!} accuracy={log.accuracy} compact />
          <p className="mt-2 break-words text-xs font-medium text-ds-text-muted">{place(log)}</p><p className="mt-0.5 text-[11px] text-ds-text-secondary">Cidade aproximada{log.accuracy !== null ? ` · Precisão: ${Math.round(log.accuracy).toLocaleString("pt-BR")} m` : ""}</p>
        </> : <div className="flex h-full min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-ds-border bg-white/60 px-5 py-6 text-center"><span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ds-bg text-ds-text-secondary"><Icon name="location_off" className="text-[22px]" /></span><p className="text-xs font-semibold text-ds-text-muted">{locationLabels[log.locationStatus]}</p><p className="mt-1 text-xs leading-relaxed text-ds-text-secondary">Sem coordenadas para exibir no mapa.</p></div>}
      </div>
    </div>
  </article>;
}

export default function AccessLogs() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AccessLogsPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AccessLog | null>(null);
  const latestRequest = useRef({ id: 0 });
  useEffect(() => {
    let disposed = false;
    const requests = latestRequest.current;
    void getMe().then(async (me) => {
      if (disposed) return;
      if (!me) { router.replace("/login"); return; }
      setUser(me);
      if (me.permissions.includes("log_acesso")) { const result = await listAccessLogs(); if (!disposed) { setData(result); setBlocked(result === null); } }
    }).catch(() => { if (!disposed) setError("Não foi possível carregar os acessos. Tente atualizar."); }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; requests.id++; };
  }, [router]);
  async function load(page: number, nextFilters: Filters = filters) {
    const request = ++latestRequest.current.id;
    setBusy(true); setError(null);
    try {
      const { from, until } = dateBounds(nextFilters);
      const result = await listAccessLogs(page, { search: nextFilters.search, from: from?.toISOString(), until: until?.toISOString() });
      if (request !== latestRequest.current.id) return;
      setData(result); setFilters(nextFilters); setSelected(null); if (result === null) setBlocked(true);
    } catch { if (request === latestRequest.current.id) setError("Não foi possível carregar os acessos. Tente atualizar."); }
    finally { if (request === latestRequest.current.id) setBusy(false); }
  }
  async function handleLogout() { await logout(); router.replace("/login"); }
  if (loading) return <FullScreenSpinner />;
  if (!user) return <p role="alert" className="p-6 text-ds-danger-text">{error ?? "Sessão expirada."}</p>;

  return <div className="flex min-h-screen bg-ds-bg">
    <Sidebar user={user} onLogout={handleLogout} />
    {!user.permissions.includes("log_acesso") || blocked ? <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pt-16 text-center md:pt-0"><Icon name="lock" className="text-[40px] text-ds-text-secondary" /><h1 className="text-xl font-bold text-ds-primary-deep">Acesso restrito</h1><p className="max-w-sm text-sm text-ds-text-secondary">Solicite a permissão de Log de acesso em Usuários e Permissões.</p></div> : <main className="min-w-0 flex-1 px-4 pb-10 pt-20 md:px-8 md:pt-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-ds-primary-deep sm:text-[34px]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ds-primary/10 text-ds-primary"><Icon name="history" className="text-[24px]" /></span>Log de acesso</h1><p className="mt-2 text-sm leading-relaxed text-ds-text-secondary">Acompanhe quem entrou e as tentativas de login.</p></div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => { void load(data?.page ?? 1); }}><span className="inline-flex items-center gap-2"><Icon name="refresh" className={`text-[18px] ${busy ? "animate-spin" : ""}`} />{busy ? "Atualizando..." : "Atualizar"}</span></Button>
            <button type="button" onClick={() => setFiltersOpen((previous) => !previous)} aria-label={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"} title={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"} aria-expanded={filtersOpen} aria-controls="access-log-filters" className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary focus-visible:ring-offset-2 ${filtersOpen || filters.search || filters.from || filters.to ? "border-ds-primary bg-ds-primary/10 text-ds-primary" : "border-ds-border bg-white text-ds-primary-deep hover:bg-ds-primary/10"}`}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" /></svg>
              {(filters.search || filters.from || filters.to) && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ds-primary"><span className="sr-only">Filtros ativos</span></span>}
            </button>
          </div>
        </header>
        <div id="access-log-filters" hidden={!filtersOpen}>
          <ListFilters dateLabel="Acesso" busy={busy} onApply={(next) => { void load(1, next); }} />
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-ds-danger-border bg-ds-danger-bg p-4 text-sm text-ds-danger-text">{error}</p>}
        <div className="mb-3 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-ds-text-muted">Histórico de acessos {data && <span className="ml-1 rounded-full bg-ds-primary/10 px-2 py-0.5 text-ds-primary-deep">{data.total}</span>}</span><span className="text-ds-text-secondary">5 por página</span></div>
        {data && data.items.length === 0 && <div className="rounded-2xl border border-ds-border-subtle bg-white p-8 text-center"><Icon name="history" className="text-[32px] text-ds-text-secondary" /><p className="mt-3 text-sm font-semibold text-ds-primary-deep">{filters.search || filters.from || filters.to ? "Nenhum acesso encontrado" : "Nenhum acesso registrado"}</p><p className="mt-1 text-xs text-ds-text-secondary">{filters.search || filters.from || filters.to ? "Altere ou limpe os filtros." : "Os próximos logins aparecerão aqui."}</p></div>}
        <div className="space-y-4" aria-busy={busy}>{data?.items.map((log) => <LogEntry key={log.id} log={log} onMap={() => setSelected(log)} />)}</div>
        {data && data.total > 0 && <nav aria-label="Paginação do log de acesso" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-ds-text-secondary"><span className="tabular-nums">Página {data.page} de {data.pageCount}</span><div className="flex gap-2"><Button variant="secondary" disabled={busy || data.page <= 1} onClick={() => { void load(data.page - 1); }}>Anterior</Button><Button variant="secondary" disabled={busy || data.page >= data.pageCount} onClick={() => { void load(data.page + 1); }}>Próxima</Button></div></nav>}
      </div>
    </main>}
    <Modal open={!!selected} onClose={() => setSelected(null)} labelledBy="access-log-title">
      {selected && <div className="flex min-h-full flex-col gap-4 md:min-h-0"><h2 id="access-log-title" className="text-xl font-bold text-ds-primary-deep">Localização do acesso</h2><div className="flex items-center gap-3"><UserAvatar name={selected.userName} avatarUrl={selected.avatarUrl} size={40} /><div className="min-w-0"><p className="break-words text-sm font-bold text-ds-primary-deep">{selected.userName}</p><p className="text-xs text-ds-text-secondary">{date(selected.createdAt)} às {time(selected.createdAt)}</p></div></div><div><LoginStatus status={selected.status} /></div><AccessLocationMap key={selected.id} latitude={selected.latitude!} longitude={selected.longitude!} accuracy={selected.accuracy} /><p className="text-xs text-ds-text-secondary">{place(selected)}{selected.accuracy !== null ? ` · Precisão aproximada: ${Math.round(selected.accuracy).toLocaleString("pt-BR")} m` : ""}</p><Button variant="secondary" className="hidden w-full md:block" onClick={() => setSelected(null)}>Fechar</Button></div>}
    </Modal>
  </div>;
}
