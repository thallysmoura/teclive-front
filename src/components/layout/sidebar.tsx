"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { listNavigation, type NavigationItem, type Role } from "@/lib/api";
import { acquirePresence, stopPresence, usePresence } from "@/lib/presence";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NavigationItemModal } from "@/components/layout/navigation-item-modal";
import { useNavigationTransition } from "@/components/layout/navigation-transition";
import { NotificationsButton } from "@/components/layout/notifications-button";

const DEFAULT_ITEMS: NavigationItem[] = [
  { key: "inicio", label: "Início", href: "/home", section: "main", sortOrder: 0 },
  { key: "administrativo", label: "Administrativo", href: null, section: "group", sortOrder: 0 },
  { key: "controle_acesso", label: "Usuários e Permissões", href: "/access-control", section: "admin", sortOrder: 0 },
  { key: "log_acesso", label: "Log de acesso", href: "/access-logs", section: "admin", sortOrder: 1 },
  { key: "dados_empresa", label: "Dados da empresa", href: "/company", section: "admin", sortOrder: 2 },
];

function EditItemButton({ item, disabled, onEdit }: { item: NavigationItem; disabled: boolean; onEdit: (item: NavigationItem) => void }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onEdit(item)} title={`Editar ${item.label}`} aria-label={`Editar ${item.label}`} aria-haspopup="dialog" className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-40">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
        <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" />
      </svg>
    </button>
  );
}

type SidebarUser = {
  permissions?: string[];
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
};

export function Sidebar({
  user,
  onLogout,
}: {
  user: SidebarUser;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(true);
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [loaded, setLoaded] = useState(false);
  const [menuError, setMenuError] = useState(false);
  const [editor, setEditor] = useState<{ item: NavigationItem | null; parent?: NavigationItem } | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const navigate = useNavigationTransition();
  const livePresence = usePresence();

  useEffect(() => acquirePresence(), []);

  useEffect(() => {
    let disposed = false;
    async function load() {
      try {
        const result = await listNavigation();
        if (!disposed) { setItems(result); setLoaded(true); setMenuError(false); }
      } catch { if (!disposed) setMenuError(true); }
    }
    void load();
    window.addEventListener("sidebar:updated", load);
    window.addEventListener("users:updated", load);
    window.addEventListener("focus", load);
    return () => { disposed = true; window.removeEventListener("sidebar:updated", load); window.removeEventListener("users:updated", load); window.removeEventListener("focus", load); };
  }, [user.id, user.role]);

  const visibleItems = loaded || user.role === "ADMIN" ? items : items.filter((item) => user.permissions?.includes(item.key));
  const hasGrantedAccess = user.role === "ADMIN" || visibleItems.some((item) => Boolean(item.href));
  const navItems = visibleItems.filter((item) => item.section === "main" && !item.parentKey);
  const adminItems = visibleItems.filter((item) => item.section === "admin" && item.href && (user.role === "ADMIN" || item.key === "log_acesso" || item.key === "dados_empresa") && (item.key !== "log_acesso" || loaded || user.permissions?.includes("log_acesso")));
  const adminGroup = items.find((item) => item.key === "administrativo") ?? DEFAULT_ITEMS[1];
  const edit = (item: NavigationItem) => { setOpen(false); setEditor({ item }); };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 grid h-16 grid-cols-[48px_1fr_48px] items-center bg-ds-primary-hover px-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-white"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-center justify-center">
          <Image src="/teclive-logo-white.png" alt="tecLive" width={1672} height={941} draggable={false} onDragStart={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()} className="h-12 w-auto select-none" />
        </div>
      </header>
      {hasGrantedAccess && <NotificationsButton desktopInSidebar={pathname !== "/home"} />}

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[70%] max-w-xs shrink-0 flex-col bg-ds-primary-hover transition-transform duration-200 ease-out md:sticky md:top-0 md:z-auto md:w-64 md:max-w-none md:translate-x-0 md:self-start ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between px-5 py-5">
          <Image src="/teclive-logo-white.png" alt="tecLive" width={1672} height={941} draggable={false} onDragStart={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()} className="h-16 w-auto select-none md:h-20" />

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white md:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="mx-5 border-t border-white/15" />

        <nav className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const children = items.filter((child) => child.parentKey === item.key);
            const expanded = expandedItems[item.key] ?? true;
            return (
              <div key={item.key} className="shrink-0">
              <div
                className={`flex shrink-0 items-center rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-black/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.href ? <Link href={item.href} aria-current={active ? "page" : undefined} onNavigate={(event) => { event.preventDefault(); setOpen(false); navigate(item.href!); }} className={`min-w-0 flex-1 break-words rounded-lg px-3 py-2 ${children.length ? "text-[11px] font-bold uppercase tracking-wide" : ""}`}>{item.label}</Link> : <span className="min-w-0 flex-1 break-words px-3 py-2 text-[11px] font-bold uppercase tracking-wide">{item.label}</span>}
                {children.length > 0 && <button type="button" onClick={() => setExpandedItems((previous) => ({ ...previous, [item.key]: !expanded }))} aria-label={`${expanded ? "Recolher" : "Expandir"} ${item.label}`} aria-expanded={expanded} aria-controls={`children-${item.key}`} className="flex h-8 shrink-0 items-center gap-1 rounded-md px-1 text-white/60 hover:bg-white/10"><span className="rounded-full bg-white/10 px-1.5 text-[9px]">{children.length}</span><Icon name={expanded ? "expand_less" : "expand_more"} className="text-[16px]" /></button>}
                {user.role === "ADMIN" && <EditItemButton item={item} disabled={!loaded} onEdit={edit} />}
                {user.role === "ADMIN" && item.href?.startsWith("/items/") && <button type="button" disabled={!loaded} onClick={() => { setOpen(false); setEditor({ item: null, parent: item }); }} aria-label={`Adicionar subitem em ${item.label}`} title="Adicionar subitem" className="mr-1 flex h-8 w-6 shrink-0 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"><Icon name="add" className="text-[16px]" /></button>}
              </div>
              {children.length > 0 && <div id={`children-${item.key}`} hidden={!expanded} className="ml-3 mt-1 space-y-0.5 border-l border-white/20 pl-2">
                {children.map((child) => <div key={child.key} className={`flex items-center rounded-lg text-xs font-medium ${pathname === child.href ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
                  <Link href={child.href!} aria-current={pathname === child.href ? "page" : undefined} onNavigate={(event) => { event.preventDefault(); setOpen(false); navigate(child.href!); }} className="min-w-0 flex-1 break-words rounded-lg px-3 py-2">{child.label}</Link>
                  {user.role === "ADMIN" && <EditItemButton item={child} disabled={!loaded} onEdit={edit} />}
                </div>)}
              </div>}
              </div>
            );
          })}

          {user.role === "ADMIN" && (
            <button type="button" disabled={!loaded} onClick={() => { setOpen(false); setEditor({ item: null }); }} className="mt-1 flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
              Adicionar item
            </button>
          )}
          {menuError && <button type="button" onClick={() => window.dispatchEvent(new Event("sidebar:updated"))} className="px-3 py-2 text-left text-xs text-white/70">Não foi possível carregar o menu. Tentar novamente.</button>}

          {(user.role === "ADMIN" || adminItems.length > 0) && (
            <div className="mt-auto shrink-0 pt-6">
              <div className="flex items-center">
              <button
                type="button"
                onClick={() => setAdminExpanded((v) => !v)}
                aria-expanded={adminExpanded}
                aria-controls={adminExpanded ? "sidebar-admin-items" : undefined}
                className="flex min-w-0 flex-1 items-center justify-between gap-1 px-3 py-1.5 text-left text-[13px] font-bold uppercase tracking-wider text-white/50 hover:text-white/70"
              >
                <span className="min-w-0 break-words">{adminGroup.label}</span>
                <Icon name={adminExpanded ? "expand_less" : "expand_more"} className="text-[18px]" />
              </button>
              </div>

              {adminExpanded && (
                <div id="sidebar-admin-items" className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-white/20 py-1 pl-2">
                  {adminItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <div
                        key={item.href}
                        className={`flex min-h-9 items-center rounded-lg border-l-2 text-[11px] font-medium transition-colors ${
                          active
                            ? "border-ds-primary bg-white/10 text-white"
                            : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Link href={item.href!} aria-current={active ? "page" : undefined} onNavigate={(event) => { event.preventDefault(); setOpen(false); navigate(item.href!); }} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
                          <Icon name={item.key === "log_acesso" ? "history" : item.key === "dados_empresa" ? "business" : "admin_panel_settings"} className="shrink-0 text-[14px]" />
                          <span className="min-w-0 break-words">{item.label}</span>
                        </Link>
                        {item.badge !== undefined && <span title={`${item.badge} usuários cadastrados`} aria-label={`${item.badge} usuários cadastrados`} className="mr-2 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-white/15 px-1 text-[9px] font-semibold tabular-nums text-white/80">{item.badge}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5 border-t border-white/10 px-4 py-3">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} presence={livePresence.users[user.id]?.presence ?? "offline"} />

          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold text-white">{user.name}</p>
            <p className="truncate text-xs text-white/60">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={() => { stopPresence(); onLogout(); }}
            aria-label="Sair"
            title="Sair"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="logout" className="text-[20px]" />
          </button>
        </div>
      </aside>
      {editor && <NavigationItemModal item={editor.item} parent={editor.parent} canDelete={!!editor.item && editor.item.createdById === user.id && !items.some((child) => child.parentKey === editor.item!.key && child.createdById !== user.id)} onClose={() => setEditor(null)} onDeleted={(deleted) => {
        const currentDeleted = pathname === deleted.href || items.some((item) => item.parentKey === deleted.key && item.href === pathname);
        setItems((previous) => previous.filter((item) => item.key !== deleted.key && item.parentKey !== deleted.key));
        setEditor(null);
        if (currentDeleted) navigate("/home");
        window.dispatchEvent(new Event("sidebar:updated"));
      }} onSaved={(saved) => {
        const creating = !editor.item;
        if (saved.parentKey) setExpandedItems((previous) => ({ ...previous, [saved.parentKey!]: true }));
        const currentItem = editor.item && pathname === editor.item.href;
        setItems((previous) => previous.some((item) => item.key === saved.key) ? previous.map((item) => item.key === saved.key ? { ...item, ...saved } : item) : [...previous, saved]);
        setEditor(null);
        window.dispatchEvent(new Event("sidebar:updated"));
        if ((creating || currentItem) && saved.href && saved.href !== pathname) navigate(saved.href);
      }} />}
    </>
  );
}
