import type { Me, NavigationItem } from "./api";

const ME_KEY = "app:me";
const NAV_KEY = "app:nav";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try { const raw = sessionStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* sem storage */ }
}

/**
 * Cada tela monta o menu de novo ao navegar. Guardar o usuário e os itens do menu na sessão
 * deixa o menu idêntico desde o primeiro quadro, sem piscar nem tela cheia de carregamento.
 * Sempre revalidado em segundo plano; apagado ao sair.
 */
export const cachedMe = () => read<Me>(ME_KEY);
export const cacheMe = (me: Me | null) => write(ME_KEY, me);
export const cachedNavigation = () => read<NavigationItem[]>(NAV_KEY);
export const cacheNavigation = (items: NavigationItem[] | null) => write(NAV_KEY, items);
export function clearSessionCache() { write(ME_KEY, null); write(NAV_KEY, null); }
