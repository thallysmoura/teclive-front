import { authFetch, ApiError } from "@/lib/api";

export const SUGGESTION_CATEGORIES = ["Visual / layout", "Novo campo ou coluna", "Novo filtro ou busca", "Novo relatório ou gráfico", "Fluxo / usabilidade", "Desempenho", "Correção de erro", "Outro"] as const;

async function fail(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? fallback);
}

export async function uploadSuggestionImage(image: Blob): Promise<string> {
  const res = await authFetch("/suggestions/image", { method: "POST", headers: { "Content-Type": image.type }, body: image });
  if (!res.ok) return fail(res, "Não foi possível enviar a imagem.");
  return (await res.json()).imageUrl as string;
}

export type SuggestionInput = { category: string; title: string; description: string; screenPath: string; screenTitle: string; imageUrl?: string; viewport?: string };

export async function createSuggestion(input: SuggestionInput) {
  const res = await authFetch("/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!res.ok) return fail(res, "Não foi possível enviar a sugestão.");
}
