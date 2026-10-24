import { ApiError, authFetch } from "./api";

export type StoredSetting<T = Record<string, unknown>> = { value: T | null; updatedAt: string | null; updatedBy: string | null };

async function parse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(Array.isArray(data?.message) ? data.message.join(" ") : data?.message ?? fallback);
  }
  return res.json();
}

export const getSetting = async <T = Record<string, unknown>>(section: string): Promise<StoredSetting<T>> =>
  parse(await authFetch(`/settings/${section}`, { cache: "no-store" }), "Não foi possível carregar a configuração.");

export const saveSetting = async <T = Record<string, unknown>>(section: string, value: T): Promise<StoredSetting<T>> =>
  parse(await authFetch(`/settings/${section}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) }), "Não foi possível salvar a configuração.");

export const getFilesUsage = async (): Promise<{ groups: { label: string; count: number; bytes: number }[] }> =>
  parse(await authFetch("/settings/files/usage", { cache: "no-store" }), "Não foi possível carregar o uso de arquivos.");
