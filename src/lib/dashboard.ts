import { ApiError, authFetch } from "./api";

type Datum = { label: string; value: number };

export type Overview = {
  generatedAt: string;
  access: { comercial: boolean; operacional: boolean; obras: boolean; estoque: boolean; cadastros: boolean; governanca: boolean };
  comercial?: {
    total: number; openCount: number; openValue: number; wonCount: number; wonValue: number; averageTicket: number; conversionRate: number; recurringValue: number; recurringTotal: number;
    statuses: Datum[]; monthlyWon: Datum[]; monthlyCount: Datum[]; bySeller: Datum[]; topClients: Datum[]; leads: number; actions: number; expiring: number;
    nextToExpire: { id: string; number: number; personName: string; validUntil: string; title: string | null }[];
  };
  operacional?: {
    total: number; open: number; late: number; value: number; openValue: number; averageCloseDays: number; ready: number; active: number; materialsPercent: number; pendingUnits: number;
    onTimePercent: number | null; billedValue: number; billedCount: number; pendingQuotes: number; pendingQuotesValue: number;
    byStatus: Datum[]; byType: Datum[]; byTechnician: Datum[]; monthly: { month: string; count: number; value: number }[];
    lateList: { id: string; number: number; personName: string; scheduleEnd: string | null }[];
  };
  estoque?: { locations: number; products: number; units: number; costValue: number; saleValue: number; zero: number; negative: number; movements30: number; lastMovement: string | null; topProducts: Datum[] };
  cadastros?: { clients: number; suppliers: number; technicians: number; sellers: number; services: number; products: number; brands: number };
  governanca?: { users: number; active7: number; pending: number; logs7: number };
};

export async function getOverview(): Promise<Overview> {
  const res = await authFetch("/dashboard/overview", { cache: "no-store" });
  if (!res.ok) throw new ApiError("Não foi possível carregar o painel executivo.");
  return res.json();
}

export type AiSummary = {
  generatedAt: string;
  panorama: string;
  indicadores: { rotulo: string; valor: string; leitura: string }[];
  atencao: { titulo: string; detalhe: string; prioridade: string }[];
  time: { titulo: string; detalhe: string }[];
  estrategia: { titulo: string; passos: string[]; impacto: string }[];
};

/** Resumo executivo gerado por IA (administradores). */
export async function getAiSummary(): Promise<AiSummary> {
  const res = await authFetch("/dashboard/ai-summary", { method: "POST" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível gerar o resumo.");
  return body as AiSummary;
}

export type AiUsageSum = { calls: number; promptTokens: number; completionTokens: number; costUsd: number };
export type AiUsageReport = {
  total: AiUsageSum; today: AiUsageSum;
  byFeature: (AiUsageSum & { key: string })[]; byModel: (AiUsageSum & { key: string })[]; byDay: (AiUsageSum & { key: string })[];
  recent: { id: string; feature: string; model: string; promptTokens: number; completionTokens: number; costUsd: number; createdAt: string }[];
  rate: { brl: number; source: string }; since: string | null;
};

export async function getAiUsage(): Promise<AiUsageReport> {
  const res = await authFetch("/ai/usage", { cache: "no-store" });
  if (!res.ok) throw new ApiError("Não foi possível carregar o custo da IA.");
  return res.json();
}
