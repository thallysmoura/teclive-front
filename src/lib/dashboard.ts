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
