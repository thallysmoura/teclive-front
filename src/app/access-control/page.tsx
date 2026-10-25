"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUser,
  getMe,
  getPermissionsCatalog,
  listNavigation,
  listUsers,
  logout,
  updateUserPermissions,
  updateUserRole,
  resetUserPassword,
  updateUserProfile,
  type ManagedUser,
  type Me,
  type Permission,
} from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { AwaitingPermission } from "@/components/layout/awaiting-permission";
import { ShellLoading } from "@/components/layout/shell-loading";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PermissionsDropdown } from "@/components/ui/permissions-dropdown";
import styles from "./access-control.module.css";
import { usePresence } from "@/lib/presence";
import { ListFilters } from "@/components/ui/list-filters";
import { EMPTY_FILTERS, matchesListFilters } from "@/lib/list-filters";
import { SortButton } from "@/components/ui/sortable";

const presenceLabels = { online: "Online", away: "Ausente", offline: "Offline" };
const presenceColors = { online: "text-ds-success", away: "text-ds-warning-text", offline: "text-ds-text-secondary" };
const USERS_PER_PAGE = 5;

function nameError(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2) return "Informe um nome com pelo menos 2 caracteres.";
  if (normalized.length > 100) return "O nome deve ter no máximo 100 caracteres.";
  if (!/^(?=.*\p{L})[\p{L}\p{M}\s.'’-]+$/u.test(normalized)) return "Use um nome válido, sem números ou símbolos.";
}

function emailError(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "Informe o e-mail.";
  if (normalized.length > 254 || !/^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(normalized)) return "Informe um e-mail válido, como nome@empresa.com.br.";
  if (["example.com", "example.org", "example.net"].includes(normalized.split("@")[1])) return "Use um e-mail com domínio real.";
}

function EditUserButton({ person, onEdit }: { person: ManagedUser; onEdit: (person: ManagedUser) => void }) {
  return (
    <button type="button" onClick={() => onEdit(person)} aria-label={`Editar ${person.name}`} title="Editar nome e e-mail" aria-haspopup="dialog" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ds-text-secondary hover:bg-ds-primary/10 hover:text-ds-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" />
      </svg>
    </button>
  );
}

function DeviceIcon({ device }: { device: ManagedUser["lastDevice"] }) {
  if (!device) return null;
  const label = `Último dispositivo: ${device === "mobile" ? "Mobile" : "Desktop"}`;
  // Google Material Icons Outlined: smartphone / desktop_windows (Apache-2.0).
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" role="img" aria-label={label} className="h-4 w-4 shrink-0 text-ds-text-secondary">
      <title>{label}</title>
      <path d={device === "mobile"
        ? "M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"
        : "M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z"} />
    </svg>
  );
}

function dateTimeLabel(value: string | null, fallback: string) {
  const formatted = formatDate(value);
  return formatted ? `${formatted.date} às ${formatted.time}` : fallback;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: date.toLocaleDateString("pt-BR"),
    time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function DateCell({ value, fallback, label }: { value: string | null; fallback: string; label: string }) {
  const formatted = formatDate(value);
  return (
    <td data-label={label} className="tabular-nums">
      {formatted ? (
        <time dateTime={value!}>
          <span className="block text-ds-text">{formatted.date}</span>
          <span className="block text-xs text-ds-text-secondary">{formatted.time}</span>
        </time>
      ) : <span className="text-xs text-ds-text-secondary">{fallback}</span>}
    </td>
  );
}

export default function AccessControlPage() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [groupPages, setGroupPages] = useState<Record<string, number>>({});
  const [userSort, setUserSort] = useState<{ key: string; desc: boolean } | null>(null);
  const toggleUserSort = (key: string) => setUserSort((current) => (current?.key === key ? { key, desc: !current.desc } : { key, desc: false }));
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const livePresence = usePresence();

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    let disposed = false;
    const refreshCatalog = async () => {
      try {
        const [updated, userList] = await Promise.all([getPermissionsCatalog(), listUsers()]);
        if (!disposed) { setCatalog(updated); setUsers(userList); }
      }
      catch { if (!disposed) setSaveError("Não foi possível atualizar as permissões disponíveis."); }
    };
    window.addEventListener("sidebar:updated", refreshCatalog);
    return () => { disposed = true; window.removeEventListener("sidebar:updated", refreshCatalog); };
  }, [user?.role]);

  useEffect(() => {
    getMe().then(async (me) => {
      if (!me) {
        router.replace("/login");
        return;
      }
      setUser(me);
      if (me.role === "ADMIN") {
        const [userList, permissionCatalog] = await Promise.all([listUsers(), getPermissionsCatalog()]);
        setUsers(userList);
        setCatalog(permissionCatalog);
      }
      setLoading(false);
    });
  }, [router]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function refreshUsers() {
    setUsers(await listUsers());
  }

  async function togglePermission(target: ManagedUser, key: string) {
    if (savingId !== null) return;
    setSaveError(null);
    setSavingId(target.id);
    const next = target.permissions.includes(key)
      ? target.permissions.filter((p) => p !== key)
      : [...target.permissions, key];
    try {
      await updateUserPermissions(target.id, next);
      await refreshUsers();
      if (target.id === user?.id) setUser((previous) => previous ? { ...previous, permissions: next } : previous);
      window.dispatchEvent(new Event("sidebar:updated"));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível salvar as permissões.");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleAdmin(target: ManagedUser) {
    if (savingId !== null) return;
    setSaveError(null);
    setSavingId(target.id);
    try {
      await updateUserRole(target.id, target.role === "ADMIN" ? "USER" : "ADMIN");
      await refreshUsers();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível salvar as permissões.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading || !user) {
    return <ShellLoading />;
  }

  const displayedUsers = users.map((original) => ({ ...original, ...livePresence.users[original.id] }));
  const detailUser = displayedUsers.find((person) => person.id === detailsId) ?? null;
  const filteredUsers = displayedUsers.filter((person) => matchesListFilters(person.name, person.email, person.createdAt, filters));
  const hasAccess = (person: ManagedUser) => person.role === "ADMIN" || person.permissions.length > 0;
  const sortUsers = (list: typeof filteredUsers) => {
    if (!userSort) return list;
    const dir = userSort.desc ? -1 : 1;
    const value = (p: (typeof filteredUsers)[number]): string | number => (userSort.key === "name" ? p.name : userSort.key === "createdAt" ? new Date(p.createdAt).getTime() : userSort.key === "lastLoginAt" ? (p.lastLoginAt ? new Date(p.lastLoginAt).getTime() : 0) : p.role === "ADMIN" ? Number.MAX_SAFE_INTEGER : p.permissions.length);
    return [...list].sort((a, b) => {
      const x = value(a), y = value(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR", { sensitivity: "base" })) * dir;
    });
  };
  const groups = [
    { id: "pending-access", title: "Aguardando permissão", pending: true, users: filteredUsers.filter((person) => !hasAccess(person)) },
    { id: "granted-access", title: "Usuários com acesso", pending: false, users: filteredUsers.filter(hasAccess) },
  ].map((group) => {
    const sortedUsers = sortUsers(group.users);
    const pageCount = Math.max(1, Math.ceil(group.users.length / USERS_PER_PAGE));
    const page = Math.min(groupPages[group.id] ?? 1, pageCount);
    const start = (page - 1) * USERS_PER_PAGE;
    return { ...group, page, pageCount, start, visibleUsers: sortedUsers.slice(start, start + USERS_PER_PAGE) };
  });

  return (
    <div className="flex min-h-screen bg-ds-bg">
      <Sidebar user={user} onLogout={handleLogout} />

      {user.role !== "ADMIN" ? (
        <AwaitingPermission user={user} />
      ) : (
        <main className="min-w-0 flex-1 px-4 pb-10 pt-20 md:px-8 md:pt-20">
          <div className={styles.content}>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 basis-full sm:basis-64">
              <h1 className="flex items-center gap-2.5 text-2xl font-extrabold leading-tight tracking-tight text-ds-primary-deep sm:text-[34px]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ds-primary/10 text-ds-primary sm:h-10 sm:w-10" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" focusable="false">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                  </svg>
                </span>
                Controle de acesso
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ds-text-secondary sm:text-base">
                Gerencie quem tem acesso ao sistema e quais áreas cada pessoa pode ver.
              </p>
            </div>
            <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            <Button
              onClick={() => setModalOpen(true)}
              className="inline-flex flex-1 items-center justify-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary focus-visible:ring-offset-2 sm:flex-none"
            >
              <span className="flex items-center justify-center gap-2">
                <Icon name="person_add" className="shrink-0 text-[20px] leading-none" />
                Novo usuário
              </span>
            </Button>
            <button type="button" onClick={() => setFiltersOpen((previous) => !previous)} aria-label={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"} title={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"} aria-expanded={filtersOpen} aria-controls="user-list-filters" className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary focus-visible:ring-offset-2 ${filtersOpen || filters.search || filters.from || filters.to ? "border-ds-primary bg-ds-primary/10 text-ds-primary" : "border-ds-border bg-white text-ds-primary-deep hover:bg-ds-primary/10"}`}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" /></svg>
              {(filters.search || filters.from || filters.to) && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ds-primary"><span className="sr-only">Filtros ativos</span></span>}
            </button>
            </div>
          </div>

            {saveError && <p role="alert" className="mb-4 text-sm text-ds-danger-text">{saveError}</p>}

            <div id="user-list-filters" hidden={!filtersOpen}>
              <ListFilters dateLabel="Cadastro" onApply={(next) => { setFilters(next); setGroupPages({}); }} />
            </div>
            <div className="space-y-8">
            {groups.filter((group) => !group.pending || group.users.length > 0).map((group) => (
              <section key={group.id} aria-labelledby={`${group.id}-title`}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 id={`${group.id}-title`} className="text-base font-bold text-ds-primary-deep">{group.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${group.pending ? "bg-ds-warning/15 text-ds-warning-text" : "bg-ds-primary/10 text-ds-primary-deep"}`}>{group.users.length}</span>
                </div>
                {group.users.length === 0 ? (
                  <p className="rounded-xl border border-ds-border-subtle bg-white px-4 py-6 text-sm text-ds-text-secondary">{filters.search || filters.from || filters.to ? "Nenhum usuário encontrado neste grupo. Altere ou limpe os filtros." : "Nenhum usuário com acesso liberado."}</p>
                ) : (
                  <>
            <ul className={styles.mobileList} aria-label={group.title}>
              {group.visibleUsers.map((person) => (
                <li key={person.id} data-role={person.role}>
                  <div className="flex items-center pr-3">
                  <button
                    type="button"
                    onClick={() => { setSaveError(null); setDetailsId(person.id); }}
                    aria-label={`Ver informações de ${person.name}, ${presenceLabels[person.presence]}`}
                    aria-haspopup="dialog"
                    className="flex min-h-20 min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-primary"
                  >
                    <UserAvatar name={person.name} avatarUrl={person.avatarUrl} presence={person.presence} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-ds-primary-deep">
                        <span className="min-w-0 break-words">{person.name}</span>
                        <DeviceIcon device={person.lastDevice} />
                      </span>
                      <span className={`mt-1 block text-xs font-medium ${presenceColors[person.presence]}`}>{presenceLabels[person.presence]}</span>
                      {group.pending && <span className="mt-1 block text-xs text-ds-warning-text">Aguardando permissão</span>}
                    </span>
                    <Icon name="chevron_right" className="shrink-0 text-[20px] text-ds-text-secondary" />
                  </button>
                  <EditUserButton person={person} onEdit={setEditTarget} />
                  </div>
                </li>
              ))}
            </ul>

            <table className={styles.table} aria-label={group.title}>
              <thead className={`text-xs font-bold uppercase tracking-wider ${group.pending ? "text-amber-900" : "text-white"}`} style={{ background: group.pending ? "#FEF3C7" : "#12A262" }}>
                <tr>
                  <th className="px-4 py-3"><SortButton label="Usuário" active={userSort?.key === "name"} desc={!!userSort?.desc} onClick={() => toggleUserSort("name")} /></th>
                  <th className="px-4 py-3"><SortButton label="Data de criação" active={userSort?.key === "createdAt"} desc={!!userSort?.desc} onClick={() => toggleUserSort("createdAt")} /></th>
                  <th className="px-4 py-3"><SortButton label="Último acesso" active={userSort?.key === "lastLoginAt"} desc={!!userSort?.desc} onClick={() => toggleUserSort("lastLoginAt")} /></th>
                  <th className="px-4 py-3"><SortButton label="Permissões" active={userSort?.key === "permissions"} desc={!!userSort?.desc} onClick={() => toggleUserSort("permissions")} /></th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {group.visibleUsers.map((u) => (
                  <tr key={u.id} data-role={u.role} className={savingId === u.id ? "opacity-50" : ""}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.name} avatarUrl={u.avatarUrl} presence={u.presence} size={40} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-semibold text-ds-text">
                            <span className="min-w-0 break-words">{u.name}</span>
                            <DeviceIcon device={u.lastDevice} />
                            <EditUserButton person={u} onEdit={setEditTarget} />
                          </p>
                          <p className="text-xs text-ds-text-secondary">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <DateCell value={u.createdAt} fallback="Não informado" label="Data de criação" />
                    <DateCell value={u.lastLoginAt} fallback="Ainda não acessou" label="Último acesso" />
                    <td data-label="Permissões">
                      <PermissionsDropdown
                        catalog={catalog}
                        selected={u.permissions}
                        admin={u.role === "ADMIN"}
                        disabled={savingId !== null}
                        adminDisabled={u.id === user.id}
                        onAdminToggle={() => { void toggleAdmin(u); }}
                        onToggle={(key) => { void togglePermission(u, key); }}
                        floating
                        fullWidth
                        compact
                        emptyLabel="Aguardando permissão"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setResetTarget(u)}
                        aria-label={`Resetar senha de ${u.name}`}
                        title="Resetar senha"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ds-primary-deep transition-colors hover:bg-ds-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary"
                      >
                        <Icon name="lock_reset" className="text-[22px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {group.pageCount > 1 && (
              <nav aria-label={`Paginação: ${group.title}`} className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-ds-text-secondary">
                <p aria-live="polite">{group.start + 1}–{Math.min(group.start + USERS_PER_PAGE, group.users.length)} de {group.users.length} usuários</p>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={group.page === 1} onClick={() => setGroupPages((previous) => ({ ...previous, [group.id]: group.page - 1 }))} className="min-h-10 rounded-lg border border-ds-border-subtle bg-white px-3 font-medium text-ds-primary-deep hover:bg-ds-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
                  <span className="whitespace-nowrap tabular-nums">Página {group.page} de {group.pageCount}</span>
                  <button type="button" disabled={group.page === group.pageCount} onClick={() => setGroupPages((previous) => ({ ...previous, [group.id]: group.page + 1 }))} className="min-h-10 rounded-lg border border-ds-border-subtle bg-white px-3 font-medium text-ds-primary-deep hover:bg-ds-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary disabled:cursor-not-allowed disabled:opacity-40">Próxima</button>
                </div>
              </nav>
            )}
                  </>
                )}
              </section>
            ))}
            </div>
          </div>
        </main>
      )}

      <UserDetailsModal
        person={detailUser}
        actorId={user.id}
        catalog={catalog}
        saving={savingId !== null}
        error={saveError}
        onClose={() => setDetailsId(null)}
        onToggle={togglePermission}
        onAdminToggle={toggleAdmin}
        onResetPassword={(person) => { setDetailsId(null); setResetTarget(person); }}
        onEdit={(person) => { setDetailsId(null); setEditTarget(person); }}
      />

      {resetTarget && <ResetPasswordModal person={resetTarget} onClose={() => setResetTarget(null)} />}

      {editTarget && (
        <EditUserModal
          person={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setUsers((previous) => previous.map((person) => person.id === updated.id ? updated : person));
            setUser((previous) => previous?.id === updated.id ? { ...previous, name: updated.name, email: updated.email } : previous);
            setEditTarget(null);
          }}
        />
      )}

      <NewUserModal
        open={modalOpen}
        catalog={catalog}
        onClose={() => setModalOpen(false)}
        onCreated={async () => { await refreshUsers(); window.dispatchEvent(new Event("users:updated")); }}
      />
    </div>
  );
}

function UserDetailsModal({ person, actorId, catalog, saving, error, onClose, onToggle, onAdminToggle, onResetPassword, onEdit }: {
  person: ManagedUser | null;
  actorId: string;
  catalog: Permission[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onToggle: (person: ManagedUser, key: string) => Promise<void>;
  onAdminToggle: (person: ManagedUser) => Promise<void>;
  onResetPassword: (person: ManagedUser) => void;
  onEdit: (person: ManagedUser) => void;
}) {
  return (
    <Modal open={!!person} onClose={onClose} labelledBy="user-details-title" mobileClose={false}>
      {person && (
        <>
          <div className="mb-5 flex items-start justify-between gap-3">
            <h2 id="user-details-title" className="text-lg font-bold text-ds-primary-deep">Informações do usuário</h2>
            <button type="button" onClick={onClose} aria-label="Fechar informações" className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ds-text-secondary hover:bg-ds-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary">
              <Icon name="close" className="text-[22px]" />
            </button>
          </div>
          <div className="mb-5 flex items-center gap-3">
            <UserAvatar name={person.name} avatarUrl={person.avatarUrl} presence={person.presence} size={52} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-semibold text-ds-primary-deep">
                <span className="min-w-0 break-words">{person.name}</span>
                <DeviceIcon device={person.lastDevice} />
                <EditUserButton person={person} onEdit={onEdit} />
              </p>
              <p className={`mt-1 text-xs font-medium ${presenceColors[person.presence]}`}>{presenceLabels[person.presence]}</p>
            </div>
          </div>
          <dl className="mb-5 divide-y divide-ds-border-subtle text-sm">
            {[
              ["E-mail", person.email],
              ["Data de criação", dateTimeLabel(person.createdAt, "Não informado")],
              ["Último acesso", dateTimeLabel(person.lastLoginAt, "Ainda não acessou")],
              ["Dispositivo", person.lastDevice === "mobile" ? "Mobile" : person.lastDevice === "desktop" ? "Desktop" : "Não informado"],
              ["Situação da conta", person.role === "ADMIN" || person.permissions.length > 0 ? "Ativo" : "Aguardando permissão"],
            ].map(([label, value]) => (
              <div key={label} className="py-3 first:pt-0">
                <dt className="mb-1 text-xs font-medium text-ds-text-secondary">{label}</dt>
                <dd className="break-words text-ds-text">{value}</dd>
              </div>
            ))}
          </dl>
          <FieldLabel>Permissões</FieldLabel>
          <div className="mb-5 mt-1.5">
            <PermissionsDropdown
              catalog={catalog}
              selected={person.permissions}
              admin={person.role === "ADMIN"}
              disabled={saving}
              adminDisabled={person.id === actorId}
              onAdminToggle={() => { void onAdminToggle(person); }}
              onToggle={(key) => { void onToggle(person, key); }}
              fullWidth
              emptyLabel="Aguardando permissão"
            />
          </div>
          {error && <p role="alert" className="mb-3 text-sm text-ds-danger-text">{error}</p>}
          <Button variant="secondary" disabled={saving} className="mb-2 inline-flex w-full items-center justify-center gap-2" onClick={() => onResetPassword(person)}>
            <Icon name="lock_reset" className="text-[20px]" />
            Resetar senha
          </Button>
          <Button variant="secondary" className="hidden w-full md:block" onClick={onClose}>Fechar</Button>
        </>
      )}
    </Modal>
  );
}

function ResetPasswordModal({ person, onClose }: { person: ManagedUser; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleReset() {
    if (loading || password) return;
    setError(null);
    setLoading(true);
    try {
      const result = await resetUserPassword(person.id);
      setPassword(result.password);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível resetar a senha.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setError(null);
    } catch {
      setError("Não foi possível copiar. Selecione a senha e copie manualmente.");
    }
  }

  return (
    <Modal open onClose={() => { if (!loading) onClose(); }} labelledBy="reset-password-title">
      <h2 id="reset-password-title" className="mb-2 text-lg font-bold text-ds-primary-deep">{password ? "Senha redefinida" : "Resetar senha"}</h2>
      <p className="mb-1 break-words text-sm font-semibold text-ds-text">{person.name}</p>
      <p className="mb-4 break-words text-xs text-ds-text-secondary">{person.email}</p>
      {password ? (
        <>
          <p className="mb-4 text-sm text-ds-text-secondary">Copie e compartilhe a nova senha com o usuário. Ela só será exibida agora.</p>
          <label className="mb-3 flex flex-col gap-1.5">
            <FieldLabel>Nova senha</FieldLabel>
            <Input value={password} readOnly autoComplete="off" className="font-mono" onFocus={(event) => event.target.select()} />
          </label>
          <Button variant="secondary" className="mb-4 inline-flex w-full items-center justify-center gap-2" onClick={() => { void copyPassword(); }}>
            <Icon name={copied ? "check" : "content_copy"} className="text-[18px]" />
            {copied ? "Senha copiada" : "Copiar senha"}
          </Button>
          {error && <p role="alert" className="mb-3 text-sm text-ds-danger-text">{error}</p>}
          <Button className="w-full" onClick={onClose}>Concluir</Button>
        </>
      ) : (
        <>
          <p className="mb-4 text-sm text-ds-text-secondary">A senha atual será substituída por uma nova senha gerada pelo sistema. Após confirmar, a senha antiga não poderá mais ser usada para entrar.</p>
          {error && <p role="alert" className="mb-3 text-sm text-ds-danger-text">{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" className="flex-1" disabled={loading} onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" disabled={loading} onClick={() => { void handleReset(); }}>{loading ? "Redefinindo..." : "Gerar nova senha"}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function EditUserModal({ person, onClose, onSaved }: { person: ManagedUser; onClose: () => void; onSaved: (person: ManagedUser) => void }) {
  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    const errors = { name: nameError(name), email: emailError(email) };
    setFieldErrors(errors);
    setError(null);
    if (errors.name || errors.email) { (errors.name ? nameRef : emailRef).current?.focus(); return; }
    setLoading(true);
    try {
      const updated = await updateUserProfile(person.id, { name: name.trim().replace(/\s+/g, " "), email: email.trim().toLowerCase() });
      onSaved(updated);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível salvar os dados.");
    } finally { setLoading(false); }
  }

  return (
    <Modal open onClose={() => { if (!loading) onClose(); }} labelledBy="edit-user-title">
      <form onSubmit={handleSubmit} noValidate>
        <h2 id="edit-user-title" className="mb-4 text-lg font-bold text-ds-primary-deep">Editar usuário</h2>
        <label className="mb-3 flex flex-col gap-1.5">
          <FieldLabel>Nome</FieldLabel>
          <Input ref={nameRef} value={name} autoComplete="name" maxLength={100} disabled={loading} required error={!!fieldErrors.name} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? "edit-name-error" : undefined}
            onChange={(event) => { setName(event.target.value); setFieldErrors((previous) => ({ ...previous, name: undefined })); setError(null); }}
            onBlur={() => setFieldErrors((previous) => ({ ...previous, name: nameError(name) }))} />
          {fieldErrors.name && <span id="edit-name-error" className="text-xs text-ds-danger-text">{fieldErrors.name}</span>}
        </label>
        <label className="mb-5 flex flex-col gap-1.5">
          <FieldLabel>E-mail</FieldLabel>
          <Input ref={emailRef} type="email" value={email} autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} disabled={loading} required error={!!fieldErrors.email} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "edit-email-error" : undefined}
            onChange={(event) => { setEmail(event.target.value); setFieldErrors((previous) => ({ ...previous, email: undefined })); setError(null); }}
            onBlur={() => setFieldErrors((previous) => ({ ...previous, email: emailError(email) }))} />
          {fieldErrors.email && <span id="edit-email-error" className="text-xs text-ds-danger-text">{fieldErrors.email}</span>}
        </label>
        {error && <p role="alert" className="mb-3 text-sm text-ds-danger-text">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" disabled={loading} onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Salvando..." : "Salvar alterações"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function NewUserModal({
  open,
  catalog,
  onClose,
  onCreated,
}: {
  open: boolean;
  catalog: Permission[];
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [allEugestor, setAllEugestor] = useState(false);
  const [eugestorKeys, setEugestorKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (open) nameRef.current?.focus();
  }, [open]);

  // "Todos os itens do eugestor": os grupos vindos do eugestor e tudo que estiver dentro deles (inclusive telas capturadas no futuro).
  useEffect(() => {
    if (!open) return;
    listNavigation().then((items) => {
      const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const groups = new Set(["indicadores", "administrativo", "comercial", "operacional", "estoque"]);
      const main = items.filter((i) => i.section === "main");
      const roots = main.filter((i) => !i.parentKey && groups.has(norm(i.label))).map((i) => i.key);
      const keys = main.filter((i) => roots.includes(i.key) || (i.parentKey && roots.includes(i.parentKey))).map((i) => i.key);
      setEugestorKeys(keys.filter((k) => catalog.some((c) => c.key === k)));
    }).catch(() => setEugestorKeys([]));
  }, [open, catalog]);

  const effective = allEugestor ? [...new Set([...eugestorKeys, ...permissions])] : permissions;

  function reset() {
    setEmail("");
    setName("");
    setPermissions([]);
    setAllEugestor(false);
    setError(null);
    setFieldErrors({});
    setCreated(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function togglePermission(key: string) {
    if (allEugestor && eugestorKeys.includes(key)) return; // já incluído pelo atalho; desmarque o atalho para ajustar um a um
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const errors = { name: nameError(name), email: emailError(email) };
    setFieldErrors(errors);
    setError(null);
    if (errors.name || errors.email) {
      (errors.name ? nameRef : emailRef).current?.focus();
      return;
    }
    setLoading(true);
    try {
      const result = await createUser({ email: email.trim().toLowerCase(), name: name.trim().replace(/\s+/g, " "), permissions: effective });
      setCreated({ email: result.user.email, password: result.password });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o usuário.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose}>
      {created ? (
        <div>
          <h2 className="mb-1 text-lg font-bold text-ds-primary-deep">Usuário criado!</h2>
          <p className="mb-4 text-sm text-ds-text-secondary">
            Compartilhe a senha abaixo com <span className="font-semibold">{created.email}</span>. Ela
            só é exibida uma vez.
          </p>
          <div className="mb-4 flex items-center justify-between gap-2 rounded-[10px] border border-ds-border bg-ds-bg px-3.5 py-2.5">
            <span className="font-mono text-sm font-bold text-ds-text">{created.password}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(created.password)}
              className="text-ds-primary-deep hover:text-ds-primary"
              aria-label="Copiar senha"
            >
              <Icon name="content_copy" className="text-[18px]" />
            </button>
          </div>
          <Button className="w-full" onClick={handleClose}>
            Concluir
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <h2 className="mb-4 text-lg font-bold text-ds-primary-deep">Novo usuário</h2>

          <label className="mb-3 flex flex-col gap-1.5">
            <FieldLabel>Nome</FieldLabel>
            <Input
              ref={nameRef}
              value={name}
              autoComplete="name"
              maxLength={100}
              disabled={loading}
              error={!!fieldErrors.name}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? "new-user-name-error" : undefined}
              onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: undefined })); setError(null); }}
              onBlur={() => setFieldErrors((prev) => ({ ...prev, name: nameError(name) }))}
              required
            />
            {fieldErrors.name && <span id="new-user-name-error" className="text-xs text-ds-danger-text">{fieldErrors.name}</span>}
          </label>

          <label className="mb-4 flex flex-col gap-1.5">
            <FieldLabel>E-mail</FieldLabel>
            <Input
              ref={emailRef}
              type="email"
              value={email}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              disabled={loading}
              error={!!fieldErrors.email}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "new-user-email-error" : undefined}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: undefined })); setError(null); }}
              onBlur={() => setFieldErrors((prev) => ({ ...prev, email: emailError(email) }))}
              required
            />
            {fieldErrors.email && <span id="new-user-email-error" className="text-xs text-ds-danger-text">{fieldErrors.email}</span>}
          </label>

          <FieldLabel>Permissões</FieldLabel>
          <label className={`mt-1.5 flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${allEugestor ? "border-ds-primary bg-ds-primary/5" : "border-ds-border hover:border-ds-primary"}`}>
            <input type="checkbox" checked={allEugestor} onChange={(e) => setAllEugestor(e.target.checked)} disabled={loading || eugestorKeys.length === 0} className="mt-0.5 h-4 w-4 shrink-0 accent-[#005CD2]" />
            <span className="min-w-0 text-sm">
              <span className="block font-bold text-ds-primary-deep">Todos os itens do eugestor</span>
              <span className="block text-xs leading-snug text-ds-text-secondary">Libera de uma vez Indicadores, Administrativo, Comercial, Operacional e Estoque, com todas as telas de cada um. Equipe e Permissões, Log de acesso e os demais você escolhe abaixo.</span>
            </span>
          </label>
          <p className="mb-1 mt-3 text-xs font-semibold text-ds-text-secondary">{allEugestor ? "Acessos adicionais (opcional)" : "Ou escolha item por item"}</p>
          <div className="mb-4">
            <PermissionsDropdown
              catalog={catalog}
              selected={effective}
              onToggle={togglePermission}
              disabled={loading}
              fullWidth
            />
          </div>

          {error && <p role="alert" className="mb-3 text-sm text-ds-danger-text">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Criando..." : "Criar usuário"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
