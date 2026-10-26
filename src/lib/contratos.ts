import { authFetch, ApiError } from "@/lib/api";

export const CONTRATOS_KEY = "item_5d3f2a10-7b46-4c1e-8f90-2a6c4e1b7d33";

export const CONTRACT_STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: "Ativo", cls: "bg-[#DDF6EA] text-[#0B7A4B]" },
  1: { label: "Cancelado", cls: "bg-[#FDE6E4] text-[#B42318]" },
  2: { label: "Encerrado", cls: "bg-[#ECEFF3] text-[#5B6775]" },
};
export const ADJUST_INDEXES: Record<number, string> = { 1: "IGPM - Índice Geral de Preços do Mercado", 2: "IPCA - Índice Nacional de Preços ao Consumidor Amplo", 3: "INPC - Índice Nacional de Preços ao Consumidor", 4: "IGP-DI - Índice Geral de Preços - Disponibilidade Interna" };
export const UNITS: Record<number, string> = { 3: "UN", 13: "MT" };

export type ContractRow = { id: string; number: string; personName: string; personDocument: string | null; personType: string; billingDay: number; totalNet: number; status: number; activeInvoices: number };
export type ContractList = { lista: ContractRow[]; totalRegistros: number; tamanhoPagina: number };
export type Address = { title?: string; street?: string; number?: string; district?: string; zip?: string; city?: string; state?: string; complement?: string };
export type ContractProduct = { id: string; description: string; identifier: string | null; unitMeasure: number; sale: number; rental: number; gratuity: number; warranty: number };
export type ContractInvoice = { id: string; description: string; type: number; netValue: number; serviceCount: number; canceled: boolean; taxPending: boolean; address: Address | null; products: ContractProduct[] };
export type ContractDetail = {
  id: string; number: string; modality: number; status: number; observation: string | null; sellerName: string | null;
  person: { id: string | null; name: string; document: string | null; type: string };
  billingGroup: { id: string; description: string } | null; paymentMethod: { id: string; description: string } | null;
  billingDay: number; dueType: number | null; startDate: string; endDate: string | null;
  adjustIndex: number | null; allowAdjust: boolean; penaltyPercent: number; totalGross: number; totalNet: number;
  invoices: ContractInvoice[]; history: { id: string; at: string; description: string; isLog: boolean; userName: string }[];
};
export type Lookups = { paymentMethods: { id: string; description: string }[]; billingGroups: { id: string; description: string }[]; sellers: { id: string; name: string }[] };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => null);
  if (res.status === 401) throw new ApiError("Sessão expirada. Entre novamente.");
  if (!res.ok) throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível concluir a operação.");
  return body as T;
}

export const contractsApi = {
  list: (p: { q?: string; status?: number[]; page?: number; orderBy?: string; desc?: boolean }) => {
    const q = new URLSearchParams({ page: String(p.page ?? 1), desc: String(p.desc ?? true) });
    if (p.q) q.set("q", p.q);
    if (p.status?.length) q.set("status", p.status.join(","));
    if (p.orderBy) q.set("orderBy", p.orderBy);
    return call<ContractList>(`/contracts?${q}`);
  },
  lookups: () => call<Lookups>("/contracts/lookups"),
  detail: (id: string) => call<ContractDetail>(`/contracts/${id}`),
  create: (b: Record<string, unknown>) => call<{ id: string; number: string }>("/contracts", { method: "POST", body: JSON.stringify(b) }),
  update: (id: string, b: Record<string, unknown>) => call<ContractDetail>(`/contracts/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (id: string) => call<{ ok: boolean }>(`/contracts/${id}`, { method: "DELETE" }),
  addInvoice: (id: string, b: Record<string, unknown>) => call<{ id: string }>(`/contracts/${id}/invoices`, { method: "POST", body: JSON.stringify(b) }),
  updateInvoice: (id: string, inv: string, b: Record<string, unknown>) => call<ContractDetail>(`/contracts/${id}/invoices/${inv}`, { method: "PUT", body: JSON.stringify(b) }),
  removeInvoice: (id: string, inv: string) => call<{ ok: boolean }>(`/contracts/${id}/invoices/${inv}`, { method: "DELETE" }),
  addProduct: (id: string, inv: string, b: Record<string, unknown>) => call<ContractDetail>(`/contracts/${id}/invoices/${inv}/products`, { method: "POST", body: JSON.stringify(b) }),
  removeProduct: (id: string, inv: string, prod: string) => call<{ ok: boolean }>(`/contracts/${id}/invoices/${inv}/products/${prod}`, { method: "DELETE" }),
  searchPeople: (q: string) => call<{ lista: { id: string; name: string; document: string | null; type: string }[] }>(`/people?q=${encodeURIComponent(q)}&page=1`),
  searchProducts: (q: string) => call<{ lista: { id: string; description: string; brand?: string }[] }>(`/products?q=${encodeURIComponent(q)}&page=1`),
};

export const fmtDoc = (d: string | null, type: string) => {
  const v = (d ?? "").replace(/\D/g, "");
  if (type === "F" && v.length === 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (v.length === 14) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return d ?? "";
};
export const addressLine = (a: Address | null) => (a ? [a.title || [a.street, a.number].filter(Boolean).join(", "), a.district, [a.city, a.state].filter(Boolean).join(" - ")].filter(Boolean).join(" · ") : "");
export const months = (start: string, end: string | null) => {
  if (!end) return null;
  const a = new Date(start), b = new Date(end);
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1) + 1);
};
export const dateBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "");
