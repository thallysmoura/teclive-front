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

export type SuggestionInput = { category?: string; title?: string; description: string; screenPath: string; screenTitle: string; imageUrl?: string; viewport?: string };

export async function createSuggestion(input: SuggestionInput) {
  const res = await authFetch("/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!res.ok) return fail(res, "Não foi possível enviar a sugestão.");
}

export type SuggestionStatus = "NOVA" | "EM_ANALISE" | "PLANEJADA" | "CONCLUIDA" | "DESCARTADA";
export const STATUS_INFO: Record<SuggestionStatus, { label: string; cls: string }> = {
  NOVA: { label: "Pendente", cls: "bg-[#FFF3D6] text-[#9A6200]" },
  EM_ANALISE: { label: "Em análise", cls: "bg-[#E1EEFF] text-[#0B57B8]" },
  PLANEJADA: { label: "Planejada", cls: "bg-[#EDE7FF] text-[#5B3FC4]" },
  CONCLUIDA: { label: "Resolvido", cls: "bg-[#DDF6EA] text-[#0B7A4B]" },
  DESCARTADA: { label: "Descartada", cls: "bg-[#ECEFF3] text-[#5B6775]" },
};

export type MySuggestion = { id: string; title: string; description: string; category: string; screenTitle: string; imageUrl: string | null; status: SuggestionStatus; createdAt: string };
export type AdminSuggestion = MySuggestion & { screenPath: string; viewport: string | null; author: { name: string; email: string; avatarUrl: string | null } };

export async function listMySuggestions(): Promise<MySuggestion[]> {
  const res = await authFetch("/suggestions/mine");
  if (!res.ok) return fail(res, "Não foi possível carregar as sugestões.");
  return res.json();
}

export async function listAllSuggestions(): Promise<AdminSuggestion[]> {
  const res = await authFetch("/suggestions");
  if (!res.ok) return fail(res, "Não foi possível carregar as sugestões.");
  return res.json();
}

export async function setSuggestionStatus(id: string, status: SuggestionStatus) {
  const res = await authFetch(`/suggestions/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  if (!res.ok) return fail(res, "Não foi possível alterar a situação.");
}
