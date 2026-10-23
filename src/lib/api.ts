const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {}

export async function login(email: string, password: string, keepConnected: boolean) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, keepConnected }),
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

async function refreshSession(): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

/**
 * GET /auth/me — se o access token (de vida curta) tiver expirado, tenta renovar
 * silenciosamente via refresh token (cookie httpOnly) antes de desistir.
 */
export async function getMe() {
  let res = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (!refreshed) return null;

    res = await fetch(`${API_URL}/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });
  }

  if (!res.ok) return null;
  return res.json();
}

export async function logout() {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
