const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {}

import type { CompanyForm, CompanyProfile } from "./company";

export type Role = "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "PENDING";

export type Presence = "online" | "away" | "offline";
export type Device = "mobile" | "desktop" | null;

export type Me = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  permissions: string[];
  avatarUrl?: string | null;
};

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  permissions: string[];
  avatarUrl: string | null;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  lastDevice: Device;
  presence: Presence;
  createdAt: string;
};

export type Permission = { key: string; label: string };
export type NavigationItem = { key: string; label: string; href: string | null; section: "main" | "admin" | "group"; sortOrder: number; badge?: number; embedUrl?: string | null; parentKey?: string | null; createdById?: string | null };

export type LoginLocation = { locationStatus: "not_requested" | "denied" | "unavailable" | "shared"; location?: { latitude: number; longitude: number; accuracy: number } };

export async function login(email: string, password: string, keepConnected: boolean, location?: LoginLocation) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, keepConnected, ...location }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message ?? "E-mail ou senha inválidos");
  }

  return res.json();
}

export async function checkEmail(email: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/check-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) throw new ApiError("Não foi possível verificar o e-mail.");
  const data = await res.json();
  return data.exists;
}

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    const renew = async () => {
      // Another request or tab may already have renewed the shared cookies.
      const current = await fetch(`${API_URL}/auth/me`, { credentials: "include", cache: "no-store" });
      if (current.ok) return Boolean((await current.json())?.id);
      if (current.status !== 401) throw new ApiError("Não foi possível verificar a sessão. Tente novamente.");
      const res = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
      if (res.status === 401) return false;
      if (!res.ok) throw new ApiError("Não foi possível renovar a sessão. Tente novamente.");
      return true;
    };
    const renewal = (async () => {
      if (typeof navigator !== "undefined" && navigator.locks) {
        return await navigator.locks.request("teclive-session-refresh", renew);
      }
      return renew();
    })();
    refreshing = renewal.finally(() => { refreshing = null; });
  }
  return refreshing;
}

/**
 * fetch autenticado — se o access token (de vida curta) tiver expirado, tenta renovar
 * silenciosamente via refresh token (cookie httpOnly) antes de desistir.
 */
async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  let res = await fetch(`${API_URL}${path}`, { ...init, credentials: "include" });

  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await fetch(`${API_URL}${path}`, { ...init, credentials: "include" });
    }
  }

  return res;
}

export async function getMe(): Promise<Me | null> {
  const res = await authFetch("/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function restorePresenceSession(): Promise<boolean> {
  const res = await authFetch("/auth/me", { cache: "no-store" });
  if (res.status === 401) return false;
  if (!res.ok) throw new ApiError("Não foi possível verificar a sessão. Tente novamente.");
  return Boolean((await res.json())?.id);
}

export async function logout() {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function getPermissionsCatalog(): Promise<Permission[]> {
  const res = await authFetch("/users/permissions-catalog");
  if (!res.ok) throw new ApiError("Não foi possível carregar as permissões.");
  return res.json();
}

export async function listUsers(): Promise<ManagedUser[]> {
  const res = await authFetch("/users");
  if (!res.ok) throw new ApiError("Não foi possível carregar os usuários.");
  return res.json();
}

export async function createUser(input: { email: string; name: string; permissions: string[] }) {
  const res = await authFetch("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível criar o usuário.");
  }
  return res.json() as Promise<{ user: ManagedUser; password: string }>;
}

export async function updateUserPermissions(id: string, permissions: string[]) {
  const res = await authFetch(`/users/${id}/permissions`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissions }),
  });
  if (!res.ok) throw new ApiError("Não foi possível atualizar as permissões.");
  return res.json() as Promise<ManagedUser>;
}

export async function updateUserRole(id: string, role: Role) {
  const res = await authFetch(`/users/${id}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new ApiError("Não foi possível atualizar o nível de acesso.");
  return res.json() as Promise<ManagedUser>;
}

export async function resetUserPassword(id: string) {
  const res = await authFetch(`/users/${id}/reset-password`, { method: "POST", cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível resetar a senha.");
  }
  return res.json() as Promise<{ user: Pick<ManagedUser, "id" | "name" | "email">; password: string }>;
}

export async function updateUserProfile(id: string, input: { name: string; email: string }): Promise<ManagedUser> {
  const res = await authFetch(`/users/${id}/profile`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível salvar os dados do usuário.");
  }
  return res.json();
}

async function navigationMutation(path: string, method: "POST" | "PATCH", label: string, embedUrl?: string | null, options?: { parentKey?: string; subItems?: { label: string; embedUrl: string | null }[] }): Promise<NavigationItem> {
  const res = await authFetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, embedUrl, ...options }) });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível salvar o item.");
  }
  return res.json();
}

export async function listNavigation(): Promise<NavigationItem[]> {
  const res = await authFetch("/navigation", { cache: "no-store" });
  if (!res.ok) throw new ApiError("Não foi possível carregar o menu.");
  return res.json();
}

export function createNavigationItem(label: string, embedUrl?: string | null, options?: { parentKey?: string; subItems?: { label: string; embedUrl: string | null }[] }) { return navigationMutation("/navigation", "POST", label, embedUrl, options); }
export function renameNavigationItem(key: string, label: string, embedUrl?: string | null) { return navigationMutation(`/navigation/${encodeURIComponent(key)}`, "PATCH", label, embedUrl); }

export async function deleteNavigationItem(key: string): Promise<void> {
  const res = await authFetch(`/navigation/${encodeURIComponent(key)}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message ?? "Não foi possível excluir o item.");
  }
}

export async function getNavigationPage(key: string): Promise<NavigationItem | null> {
  const res = await authFetch(`/navigation/${encodeURIComponent(key)}`, { cache: "no-store" });
  if (res.status === 403) return null;
  if (!res.ok) throw new ApiError(res.status === 404 ? "Página não encontrada." : "Não foi possível carregar a página.");
  return res.json();
}

export type AccessLog = {
  avatarUrl: string | null; status: "VALID" | "INVALID";
  id: string; userId: string | null; userName: string; userEmail: string; device: string;
  userAgent: string | null; ip: string | null; createdAt: string;
  locationStatus: LoginLocation["locationStatus"];
  latitude: number | null; longitude: number | null; accuracy: number | null;
  city: string | null; region: string | null; country: string | null;
};
export type AccessLogsPage = { items: AccessLog[]; total: number; page: number; pageCount: number };

export async function listAccessLogs(page = 1, filters: { search?: string; from?: string; until?: string } = {}): Promise<AccessLogsPage | null> {
  const query = new URLSearchParams({ page: String(page) });
  for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
  const res = await authFetch(`/access-logs?${query}`, { cache: "no-store" });
  if (res.status === 403) return null;
  if (!res.ok) throw new ApiError("Não foi possível carregar o log de acesso.");
  return res.json();
}

export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  const response = await authFetch("/company", { cache: "no-store" });
  if (!response.ok) throw new ApiError("Não foi possível carregar os dados da empresa.");
  return response.json();
}
export async function saveCompanyProfile(data: CompanyForm): Promise<CompanyProfile> {
  const response = await authFetch("/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível salvar os dados da empresa.");
  }
  return response.json();
}
