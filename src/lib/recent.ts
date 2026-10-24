/** Histórico de telas abertas por cada pessoa (guardado neste navegador, separado por usuário). */
export type RecentVisit = { href: string; label: string; group?: string; at: string };

const key = (userId: string) => `eg:recent:${userId}`;
const MAX = 12;

export function getRecent(userId: string): RecentVisit[] {
  try { return JSON.parse(localStorage.getItem(key(userId)) ?? "[]") as RecentVisit[]; } catch { return []; }
}

export function recordRecent(userId: string, visit: Omit<RecentVisit, "at">) {
  try {
    const list = getRecent(userId).filter((v) => v.href !== visit.href);
    localStorage.setItem(key(userId), JSON.stringify([{ ...visit, at: new Date().toISOString() }, ...list].slice(0, MAX)));
  } catch { /* sem armazenamento: apenas não registra */ }
}
