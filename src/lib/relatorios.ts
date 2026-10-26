import { authFetch, ApiError } from "@/lib/api";
import type { StrategicReport } from "@/components/relatorios/report-viewer";

export const RELATORIOS_KEY = "item_8c5e1a52-3f0b-4b7e-9d41-6a2f7c9e0b11";

export type PeopleReportContact = { name?: string; phone?: string; email?: string; type?: string };
export type PeopleReportItem = { name: string; document: string; rg: string; phone: string; municipalRegistration: string; address: string; active: boolean; contacts: PeopleReportContact[] };
export type PeopleReport = {
  company: string; generatedBy: string; generatedAt: string;
  filters: { personType: string; taxpayer: string; registerType: string; status: string };
  items: PeopleReportItem[];
};
export type PeopleReportQuery = { personType: "T" | "F" | "J"; taxpayer: string; registerType: string; inactive: boolean };

export async function getPeopleReport(q: PeopleReportQuery): Promise<PeopleReport> {
  const params = new URLSearchParams({ personType: q.personType, taxpayer: q.taxpayer, registerType: q.registerType, inactive: String(q.inactive) });
  const res = await authFetch(`/people/report?${params}`, { cache: "no-store" });
  if (res.status === 401) throw new ApiError("Sessão expirada. Entre novamente.");
  if (!res.ok) throw new ApiError("Não foi possível gerar o relatório.");
  return res.json();
}

/** Relatório de dados estratégicos: kind = geral | comercial | operacional | estoque | cadastros. */
export async function getStrategicReport(kind: string): Promise<StrategicReport> {
  const res = await authFetch(`/dashboard/report?kind=${encodeURIComponent(kind)}`, { cache: "no-store" });
  if (res.status === 401) throw new ApiError("Sessão expirada. Entre novamente.");
  if (!res.ok) throw new ApiError("Não foi possível gerar o relatório.");
  return res.json();
}
