"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cacheNavigation, cachedNavigation } from "@/lib/session-cache";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { deleteNavigationItem, listNavigation, type NavigationItem, type Role } from "@/lib/api";
import { acquirePresence, stopPresence, usePresence } from "@/lib/presence";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NavigationItemModal } from "@/components/layout/navigation-item-modal";
import { useNavigationTransition } from "@/components/layout/navigation-transition";
import { NotificationsButton } from "@/components/layout/notifications-button";

const DEFAULT_ITEMS: NavigationItem[] = [
  { key: "inicio", label: "Início", href: "/home", section: "main", sortOrder: 0 },
  { key: "administrativo", label: "Governança", href: null, section: "group", sortOrder: 0 },
  { key: "controle_acesso", label: "Equipe e Permissões", href: "/access-control", section: "admin", sortOrder: 0 },
  { key: "log_acesso", label: "Log de acesso", href: "/access-logs", section: "admin", sortOrder: 1 },
  { key: "dados_empresa", label: "Dados da empresa", href: "/company", section: "admin", sortOrder: 2 },
];

const MENU_ICONS: Record<string, string> = {
  "Visão Geral": "home", Indicadores: "area_chart", Administrativo: "apartment", Comercial: "work", Estoque: "inventory_2", "Governança": "shield_person",
};

/** Ícone sólido do item principal do menu (mesmo estilo do eugestor). */
function MenuIcon({ label }: { label: string }) {
  const name = MENU_ICONS[label];
  if (!name) return <span className="w-6 shrink-0" aria-hidden="true" />;
  return <span aria-hidden="true" className="material-symbols-outlined w-6 shrink-0 text-center text-[22px] leading-none text-white/85" style={{ fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24' }}>{name}</span>;
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function DeleteItemButton({ item, disabled, onDelete }: { item: NavigationItem; disabled: boolean; onDelete: (item: NavigationItem) => void }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onDelete(item)} title={`Excluir ${item.label}`} aria-label={`Excluir ${item.label}`} className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-40">
      <Icon name="delete" className="text-[16px]" />
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

/** Expande/recolhe com transição suave de altura (o conteúdo continua montado). */
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }} aria-hidden={!open} inert={!open}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

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
  const [menuQuery, setMenuQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  // Atalho: "/" leva o cursor para a busca do menu (fora de campos de texto).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || target?.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Itens do menu da última visita: o menu aparece completo e igual desde o primeiro quadro.
  useLayoutEffect(() => { const cached = cachedNavigation(); if (cached?.length) { setItems(cached); setLoaded(true); } }, []);
  const [editor, setEditor] = useState<{ item: NavigationItem | null; parent?: NavigationItem } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const tightRef = useRef(false);
  const lastOpenedRef = useRef<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (event: MouseEvent) => { if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setUserMenuOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [userMenuOpen]);
  const groupsRef = useRef<{ keys: string[]; current: string | null; adminCurrent: boolean }>({ keys: [], current: null, adminCurrent: false });
  // Tamanho fixo por padrão. Só se faltar espaço o menu se ajusta, de uma vez e antes da primeira pintura
  // (sem "pulo"): 1) todos os textos encolhem juntos; 2) espaços entre linhas; 3) só o grupo da página fica aberto.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const inner = innerRef.current;
    if (!nav || !inner) return;
    const apply = (zoom: number, pad: number) => { nav.style.setProperty("--fit", String(zoom)); nav.style.setProperty("--pad", String(pad)); };
    // Mede a altura natural do conteúdo (sem a altura mínima que empurra a Governança para o rodapé).
    const overflows = () => {
      inner.style.minHeight = "0px";
      const height = inner.getBoundingClientRect().height;
      inner.style.minHeight = "";
      return height > nav.clientHeight + 0.5;
    };
    const fit = () => {
      // Fonte fixa: só os espaços entre linhas.
      let zoom = 1;
      let pad = 1;
      apply(zoom, pad);
      while (overflows() && pad > 0.1) { pad = Math.round((pad - 0.1) * 10) / 10; apply(zoom, pad); }
      // Cabendo, a rolagem fica desligada de vez; só no caso extremo (janela minúscula) ela existe, sem barra visível.
      nav.style.overflowY = overflows() ? "auto" : "hidden";
      if (overflows() && !tightRef.current) {
        tightRef.current = true;
        const groups = groupsRef.current;
        setExpandedItems(() => ({ ...Object.fromEntries(groups.keys.map((key) => [key, false])), ...((lastOpenedRef.current ?? groups.current) ? { [(lastOpenedRef.current ?? groups.current)!]: true } : {}) }));
        if (!groups.adminCurrent) setAdminExpanded(false);
      }
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(nav);
    resize.observe(inner);
    const mutation = new MutationObserver(fit);
    mutation.observe(inner, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    const onResize = () => { tightRef.current = false; fit(); };
    window.addEventListener("resize", onResize);
    return () => { resize.disconnect(); mutation.disconnect(); window.removeEventListener("resize", onResize); };
  }, []);
  const [expandedItems, setExpandedItemsState] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(sessionStorage.getItem("sidebar:expanded") ?? "{}"); } catch { return {}; }
  });
  const setExpandedItems = (update: (previous: Record<string, boolean>) => Record<string, boolean>) => {
    setExpandedItemsState((previous) => {
      const next = update(previous);
      try { sessionStorage.setItem("sidebar:expanded", JSON.stringify(next)); } catch { /* sem storage */ }
      return next;
    });
  };
  const toggleGroup = (key: string, expanded: boolean) => {
    lastOpenedRef.current = expanded ? null : key;
    setExpandedItems((previous) => (tightRef.current && !expanded ? { ...Object.fromEntries(groupsRef.current.keys.map((k) => [k, false])), [key]: true } : { ...previous, [key]: !expanded }));
  };
  const isCurrent = (href: string | null) => !!href && (pathname === href || pathname.startsWith(href + "/"));
  const pathname = usePathname();
  const navigate = useNavigationTransition();
  const livePresence = usePresence();

  useEffect(() => acquirePresence(), []);

  useEffect(() => {
    let disposed = false;
    async function load() {
      try {
        const result = await listNavigation();
        if (!disposed) { setItems(result); setLoaded(true); setMenuError(false); cacheNavigation(result); }
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
  const adminItems = visibleItems.filter((item) => item.section === "admin" && item.href && (user.role === "ADMIN" || item.key === "log_acesso" || item.key === "dados_empresa" || item.key === "ajuda") && (item.key !== "log_acesso" || loaded || user.permissions?.includes("log_acesso")));
  const adminGroup = items.find((item) => item.key === "administrativo") ?? DEFAULT_ITEMS[1];
  const query = normalize(menuQuery.trim());
  const searching = query.length > 0;
  const itemMatches = (item: { label: string }) => normalize(item.label).includes(query);
  const childrenOf = (item: { key: string }) => items.filter((child) => child.parentKey === item.key);
  const shownNavItems = searching ? navItems.filter((item) => itemMatches(item) || childrenOf(item).some(itemMatches)) : navItems;
  const shownAdminItems = searching ? adminItems.filter(itemMatches) : adminItems;
  const nothingFound = searching && shownNavItems.length === 0 && shownAdminItems.length === 0;
  const firstResult = (() => {
    for (const item of shownNavItems) {
      const kids = childrenOf(item).filter((child) => itemMatches(item) || itemMatches(child));
      const target = kids.find((child) => child.href)?.href ?? (kids.length === 0 ? item.href : null);
      if (target) return target;
    }
    return shownAdminItems.find((item) => item.href)?.href ?? null;
  })();
  groupsRef.current = {
    keys: navItems.filter((item) => items.some((child) => child.parentKey === item.key)).map((item) => item.key),
    current: navItems.find((item) => items.some((child) => child.parentKey === item.key && isCurrent(child.href)))?.key ?? null,
    adminCurrent: adminItems.some((item) => isCurrent(item.href)),
  };
  const canDeleteItem = (item: NavigationItem) => user.role === "ADMIN" && item.createdById === user.id && !items.some((child) => child.parentKey === item.key && child.createdById !== user.id);
  const handleDeleted = (deleted: NavigationItem) => {
    const currentDeleted = pathname === deleted.href || items.some((item) => item.parentKey === deleted.key && item.href === pathname);
    setItems((previous) => previous.filter((item) => item.key !== deleted.key && item.parentKey !== deleted.key));
    setEditor(null);
    if (currentDeleted) navigate("/home");
    window.dispatchEvent(new Event("sidebar:updated"));
  };
  const remove = async (item: NavigationItem) => {
    if (!window.confirm(`Excluir "${item.label}"? Esta ação não pode ser desfeita.`)) return;
    try { await deleteNavigationItem(item.key); handleDeleted(item); } catch (error) { window.alert(error instanceof Error ? error.message : "Não foi possível excluir o item."); }
  };

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
          <Link href="/home" aria-label="Ir para a página inicial" title="Página inicial" onNavigate={(event) => { event.preventDefault(); setOpen(false); navigate("/home"); }} className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><Image src="/teclive-logo-white.png" alt="tecLive" width={1672} height={941} draggable={false} onDragStart={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()} className="h-12 w-auto select-none" /></Link>
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
          <Link href="/home" aria-label="Ir para a página inicial" title="Página inicial" onNavigate={(event) => { event.preventDefault(); setOpen(false); navigate("/home"); }} className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><Image src="/teclive-logo-white.png" alt="tecLive" width={1672} height={941} draggable={false} onDragStart={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()} className="h-16 w-auto select-none md:h-20" /></Link>

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

        <nav ref={navRef} className="sidebar-fit mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div ref={innerRef} className="sidebar-fit-inner flex shrink-0 flex-col gap-0.5 px-3 pb-3">
          <div className="relative mb-2 shrink-0">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-white/60" />
            <input
              ref={searchRef} type="search" value={menuQuery} autoComplete="off" spellCheck={false}
              onChange={(event) => setMenuQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") { setMenuQuery(""); event.currentTarget.blur(); }
                if (event.key === "Enter" && firstResult) { event.preventDefault(); setOpen(false); setMenuQuery(""); navigate(firstResult); }
              }}
              placeholder="Buscar no menu..." aria-label="Buscar no menu"
              className="h-10 w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-14 text-sm text-white outline-none transition placeholder:text-white/55 focus:border-white/40 focus:bg-white/15 focus:ring-2 focus:ring-white/20 [&::-webkit-search-cancel-button]:hidden"
            />
            {menuQuery ? (
              <button type="button" aria-label="Limpar busca" onClick={() => { setMenuQuery(""); searchRef.current?.focus(); }} className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"><Icon name="close" className="text-[16px]" /></button>
            ) : (
              <kbd aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/20 px-1.5 text-[11px] font-medium text-white/50 md:block">/</kbd>
            )}
          </div>
          {nothingFound && <p role="status" className="px-3 py-4 text-center text-xs text-white/60">Nenhum item encontrado para &quot;{menuQuery}&quot;.</p>}
          {shownNavItems.map((item) => {
            const active = pathname === item.href;
            const allChildren = childrenOf(item);
            const children = searching && !itemMatches(item) ? allChildren.filter(itemMatches) : allChildren;
            const expanded = searching ? children.length > 0 : (expandedItems[item.key] ?? children.some((child) => isCurrent(child.href)));
            return (
              <div key={item.key} className="shrink-0">
              <div
                className={`flex shrink-0 items-center rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-black/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {children.length > 0 ? <button type="button" onClick={() => toggleGroup(item.key, expanded)} aria-expanded={expanded} aria-controls={`children-${item.key}`} className="min-w-0 flex-1 break-words rounded-lg px-3 py-2 text-left"><span className="flex items-center gap-3"><MenuIcon label={item.label} />{item.label}</span></button> : item.href ? <Link href={item.href} aria-current={active ? "page" : undefined} onNavigate={(event) => { event.preventDefault(); setOpen(false); navigate(item.href!); }} className={`min-w-0 flex-1 break-words rounded-lg px-3 py-2 `}><span className="flex items-center gap-3"><MenuIcon label={item.label} />{item.label}</span></Link> : <span className="min-w-0 flex-1 break-words px-3 py-2">{item.label}</span>}
                {children.length > 0 && <button type="button" onClick={() => toggleGroup(item.key, expanded)} aria-label={`${expanded ? "Recolher" : "Expandir"} ${item.label}`} aria-expanded={expanded} aria-controls={`children-${item.key}`} className="flex h-8 shrink-0 items-center gap-1 rounded-md px-1 text-white/60 hover:bg-white/10"><span className="rounded-full bg-white/10 px-1.5 text-[9px]">{children.length}</span><Icon name={expanded ? "expand_less" : "expand_more"} className="text-[16px]" /></button>}
                {user.role === "ADMIN" && item.createdById === user.id && item.href?.startsWith("/items/") && <button type="button" disabled={!loaded} onClick={() => { setOpen(false); setEditor({ item: null, parent: item }); }} aria-label={`Adicionar subitem em ${item.label}`} title="Adicionar subitem" className="mr-1 flex h-8 w-6 shrink-0 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"><Icon name="add" className="text-[16px]" /></button>}
                {canDeleteItem(item) && <DeleteItemButton item={item} disabled={!loaded} onDelete={remove} />}
              </div>
              {children.length > 0 && <Collapse open={expanded}><div id={`children-${item.key}`} className="ml-3 mt-1 space-y-0.5 border-l border-white/20 pl-2">
                {children.map((child) => <div key={child.key} className={`flex items-center rounded-lg text-sm font-medium ${isCurrent(child.href) ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
                  <Link href={child.href!} aria-current={isCurrent(child.href) ? "page" : undefined} onNavigate={(event) => { event.preventDefault(); setOpen(false); navigate(child.href!); }} className="min-w-0 flex-1 break-words rounded-lg px-3 py-2">{child.label}</Link>
                  {canDeleteItem(child) && <DeleteItemButton item={child} disabled={!loaded} onDelete={remove} />}
                </div>)}
              </div></Collapse>}
              </div>
            );
          })}

          {user.role === "ADMIN" && !searching && (
            <button type="button" disabled={!loaded} onClick={() => { setOpen(false); setEditor({ item: null }); }} className="mt-1 flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
              Adicionar item
            </button>
          )}
          {menuError && <button type="button" onClick={() => window.dispatchEvent(new Event("sidebar:updated"))} className="px-3 py-2 text-left text-xs text-white/70">Não foi possível carregar o menu. Tentar novamente.</button>}

          {(user.role === "ADMIN" || adminItems.length > 0) && (!searching || shownAdminItems.length > 0) && (
            <div className="-mx-3 -mb-3 mt-auto shrink-0 bg-black/20 px-3 pb-3 pt-3">
              <div className="flex items-center">
              <button
                type="button"
                onClick={() => setAdminExpanded((v) => !v)}
                aria-expanded={adminExpanded}
                aria-controls={adminExpanded ? "sidebar-admin-items" : undefined}
                className="flex min-w-0 flex-1 items-center justify-between gap-1 px-3 py-1.5 text-left text-sm font-medium text-white/50 hover:text-white/70"
              >
                <span className="flex min-w-0 items-center gap-3 break-words"><MenuIcon label={adminGroup.label} />{adminGroup.label}</span>
                <Icon name={adminExpanded ? "expand_less" : "expand_more"} className="text-[18px]" />
              </button>
              </div>

              <Collapse open={adminExpanded || searching}>
                <div id="sidebar-admin-items" className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-white/20 py-1 pl-2">
                  {shownAdminItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <div
                        key={item.href}
                        className={`flex min-h-8 items-center rounded-lg border-l-2 text-xs font-medium transition-colors ${
                          active
                            ? "border-ds-primary bg-white/10 text-white"
                            : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Link href={item.href!} aria-current={active ? "page" : undefined} onNavigate={(event) => { event.preventDefault(); setOpen(false); navigate(item.href!); }} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
                          <Icon name={item.key === "ajuda" ? "help" : item.key === "log_acesso" ? "history" : item.key === "dados_empresa" ? "business" : "admin_panel_settings"} className="shrink-0 text-[14px]" />
                          <span className="min-w-0 break-words">{item.label}</span>
                        </Link>
                        {item.badge !== undefined && <span title={`${item.badge} usuários cadastrados`} aria-label={`${item.badge} usuários cadastrados`} className="mr-2 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-white/15 px-1 text-[9px] font-semibold tabular-nums text-white/80">{item.badge}</span>}
                      </div>
                    );
                  })}
                </div>
              </Collapse>
            </div>
          )}
        </div>
        </nav>

        <div ref={userMenuRef} className="relative shrink-0 border-t border-white/10 px-2 py-2">
          <Collapse open={userMenuOpen}>
            <div role="menu" className="mb-2 overflow-hidden rounded-lg bg-white/10 py-1 text-sm font-medium text-white">
              <Link role="menuitem" href="/meus-dados" onNavigate={(event) => { event.preventDefault(); setUserMenuOpen(false); setOpen(false); navigate("/meus-dados"); }} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/10"><Icon name="person" className="text-[18px]" />Meus Dados</Link>
              <Link role="menuitem" href="/ajuda" onNavigate={(event) => { event.preventDefault(); setUserMenuOpen(false); setOpen(false); navigate("/ajuda"); }} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/10"><Icon name="help" className="text-[18px]" />Central de Ajuda</Link>
              <button type="button" role="menuitem" onClick={() => { stopPresence(); onLogout(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-white/10"><Icon name="logout" className="text-[18px]" />Sair</button>
            </div>
          </Collapse>
          <button type="button" onClick={() => setUserMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={userMenuOpen} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/10">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} presence={livePresence.users[user.id]?.presence ?? "offline"} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-bold text-white">{user.name}</span>
              <span className="block truncate text-xs text-white/60">{user.email}</span>
            </span>
            <Icon name={userMenuOpen ? "expand_more" : "expand_less"} className="text-[20px] text-white/70" />
          </button>
        </div>
      </aside>
      {editor && <NavigationItemModal item={editor.item} parent={editor.parent} canDelete={!!editor.item && editor.item.createdById === user.id && !items.some((child) => child.parentKey === editor.item!.key && child.createdById !== user.id)} onClose={() => setEditor(null)} onDeleted={handleDeleted} onSaved={(saved) => {
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
