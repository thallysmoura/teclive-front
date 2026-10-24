"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useNavigationTransition } from "@/components/layout/navigation-transition";

function BellIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
  </svg>;
}

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

const exact = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Manaus", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
/** Notificações de "nova pessoa aguardando permissão" trazem nome e foto de quem entrou. */
function personOf(n: AppNotification): { name: string; avatarUrl: string | null } | null {
  const d = n.data as { type?: string; name?: string; avatarUrl?: string | null } | null;
  return d?.type === "access-request" && d.name ? { name: d.name, avatarUrl: d.avatarUrl ?? null } : null;
}

/** Lista de notificações no estilo das redes sociais (abas, ponto de não lida, "marcar todas"). */
function NotificationList({ items, unreadCount, onRead, onReadAll, loading }: { items: AppNotification[]; unreadCount: number; onRead: (n: AppNotification) => void; onReadAll: () => void; loading: boolean }) {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const shown = tab === "unread" ? items.filter((n) => !n.readAt) : items;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="notifications-title" className="text-xl font-bold text-ds-primary-deep">Notificações</h2>
        <button type="button" onClick={onReadAll} disabled={unreadCount === 0} className="text-xs font-semibold text-ds-primary hover:underline disabled:cursor-not-allowed disabled:opacity-40">Marcar todas como lidas</button>
      </div>
      <div role="tablist" className="mb-2 flex gap-2">
        {([["all", "Todas"], ["unread", `Não lidas${unreadCount ? ` (${unreadCount})` : ""}`]] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-full px-3 py-1 text-sm font-semibold ${tab === key ? "bg-ds-primary/10 text-ds-primary" : "text-ds-text-muted hover:bg-ds-bg"}`}>{label}</button>
        ))}
      </div>
      <ul className="-mx-2 min-h-0 flex-1 overflow-y-auto">
        {shown.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => onRead(n)} className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-ds-bg">
              {personOf(n) ? <span className="mt-0.5 shrink-0"><UserAvatar name={personOf(n)!.name} avatarUrl={personOf(n)!.avatarUrl} size={40} /></span> : <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ds-primary/10 text-ds-primary"><BellIcon className="h-5 w-5" /></span>}
              <span className="min-w-0 flex-1">
                <span className={`block text-sm text-ds-text ${n.readAt ? "font-medium" : "font-bold"}`}>{n.title}</span>
                <span className="line-clamp-2 block text-sm text-ds-text-muted">{n.message}</span>
                <span className={`block text-xs ${n.readAt ? "text-ds-text-secondary" : "font-semibold text-ds-primary"}`}>{personOf(n) ? `${exact(n.createdAt)} · ${timeAgo(n.createdAt)}` : timeAgo(n.createdAt)}</span>
              </span>
              {!n.readAt && <span className="mt-3 h-2.5 w-2.5 shrink-0 rounded-full bg-ds-primary" aria-label="Não lida" />}
            </button>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ds-primary/10 text-ds-primary"><BellIcon className="h-7 w-7" /></span>
            <p className="text-sm text-ds-text-secondary">{loading ? "Carregando..." : tab === "unread" ? "Você não tem notificações não lidas." : "Suas notificações aparecerão aqui."}</p>
          </li>
        )}
      </ul>
    </div>
  );
}

export function NotificationsButton({ desktopInSidebar = false }: { desktopInSidebar?: boolean }) {
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number }>({ top: 64 });
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const navigate = useNavigationTransition();

  const load = useCallback(() => {
    setLoading(true);
    return listNotifications().then((r) => { setItems(r.lista); setUnread(r.unreadCount); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("eg:notifications", refresh);
    return () => window.removeEventListener("eg:notifications", refresh);
  }, [load]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 15000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open || !desktop) return;
    const close = (e: MouseEvent) => { if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open, desktop]);

  function toggle() {
    if (open) return setOpen(false);
    const rect = button.current?.getBoundingClientRect();
    if (rect) setPos(desktopInSidebar ? { top: rect.bottom + 8, left: Math.max(8, Math.min(rect.left, window.innerWidth - 424)) } : { top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
    setOpen(true);
    void load();
  }

  async function read(n: AppNotification) {
    // Notificações com destino (ex.: comentário em uma OS) levam direto para a tela.
    const url = (n.data as { url?: unknown } | null)?.url;
    if (typeof url === "string" && url.startsWith("/")) { setOpen(false); navigate(url); }
    if (n.readAt) return;
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    setUnread((c) => Math.max(0, c - 1));
    await markNotificationRead(n.id);
  }

  async function readAll() {
    setItems((list) => list.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    setUnread(0);
    await markAllNotificationsRead();
  }

  const list = <NotificationList items={items} unreadCount={unread} onRead={read} onReadAll={readAll} loading={loading} />;

  return <>
    <button ref={button} type="button" onClick={toggle} aria-label={unread ? `Notificações (${unread} não lidas)` : "Notificações"} title="Notificações" aria-haspopup="dialog" aria-expanded={open} className={`fixed right-3 top-2 z-30 flex h-12 w-12 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:h-10 md:w-10 ${desktopInSidebar ? "md:left-48 md:right-auto md:top-10 md:bg-white/10 md:hover:bg-white/15" : "md:right-6 md:top-4 md:border md:border-ds-border-subtle md:bg-white md:text-ds-primary-deep md:shadow-sm md:hover:bg-ds-primary/10 md:focus-visible:ring-ds-primary"}`}>
      <BellIcon />
      {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ds-danger px-1 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
    </button>

    {desktop ? (
      open && (
        <div ref={panel} role="dialog" aria-labelledby="notifications-title" style={pos} className="fixed z-50 flex max-h-[min(36rem,calc(100dvh-5rem))] w-[26rem] max-w-[calc(100vw-1rem)] flex-col rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-2xl">
          {list}
        </div>
      )
    ) : (
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="notifications-title">
        <div className="flex min-h-[calc(100dvh-2.5rem)] flex-col gap-4">
          {list}
          <Button variant="secondary" className="w-full" onClick={() => setOpen(false)}>Fechar</Button>
        </div>
      </Modal>
    )}
  </>;
}
