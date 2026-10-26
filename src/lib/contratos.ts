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

const KEY = (n: string) => `item_c0a1b2c3-0000-4d5e-8f60-aaaaaaaaaa${n}`;
export const REAJUSTE_KEY = KEY("02"), GRUPOS_KEY = KEY("03"), MODELOS_KEY = KEY("04"), BONIF_KEY = KEY("05"), CANCEL_KEY = KEY("06"), BLOQUEIO_KEY = KEY("07");
export const TEMPLATE_TYPES = ["Novo Contrato", "Aditivo de Contrato", "Reajuste Contratual", "Distrato"];
export const CANCEL_STAGES = ["Aguardando Faturar Multa", "Gerar Distrato", "OS Pendente", "Contratos a Faturar", "Cancelar Serviços", "Revertido", "Finalizado"];

export type Group = { id: string; description: string; isActive: boolean };
export type Template = { id: string; description: string; type: number; isActive: boolean };
export type Adjustment = { id: string; at: string; userName: string; filterType: string; months: number; indexId: number | null; groupName: string | null; percent: number; rounded: boolean; contractCount: number; valueBefore: number; valueAfter: number; canceledAt: string | null };
export type Charge = { id: string; contractId: string; contractNo: string; personName: string; kind: number; competence: string; description: string; value: number; canceledAt: string | null };
export type Cancellation = { id: string; contractId: string; contractNo: string; personName: string; stage: number; reason: string | null; effectiveDate: string; fine: number };
export type Eligible = { id: string; number: string; personName: string; totalNet: number; adjustIndex: number | null; startDate: string };

export const adminApi = {
  groups: (q = "", inactive = false) => call<Group[]>(`/contract-admin/groups?q=${encodeURIComponent(q)}&inactive=${inactive}`),
  saveGroup: (id: string | null, b: Record<string, unknown>) => call<Group>(id ? `/contract-admin/groups/${id}` : "/contract-admin/groups", { method: id ? "PUT" : "POST", body: JSON.stringify(b) }),
  templates: (q = "", inactive = false) => call<Template[]>(`/contract-admin/templates?q=${encodeURIComponent(q)}&inactive=${inactive}`),
  saveTemplate: (id: string | null, b: Record<string, unknown>) => call<Template>(id ? `/contract-admin/templates/${id}` : "/contract-admin/templates", { method: id ? "PUT" : "POST", body: JSON.stringify(b) }),
  adjustments: (q = "") => call<Adjustment[]>(`/contract-admin/adjustments?q=${encodeURIComponent(q)}`),
  searchAdjust: (b: Record<string, unknown>) => call<Eligible[]>("/contract-admin/adjustments/search", { method: "POST", body: JSON.stringify(b) }),
  applyAdjust: (b: Record<string, unknown>) => call<Adjustment>("/contract-admin/adjustments", { method: "POST", body: JSON.stringify(b) }),
  charges: (q = "", canceled = false) => call<Charge[]>(`/contract-admin/charges?q=${encodeURIComponent(q)}&canceled=${canceled}`),
  createCharge: (b: Record<string, unknown>) => call<Charge>("/contract-admin/charges", { method: "POST", body: JSON.stringify(b) }),
  cancelCharge: (id: string) => call<Charge>(`/contract-admin/charges/${id}/cancel`, { method: "POST" }),
  cancellations: (q = "") => call<Cancellation[]>(`/contract-admin/cancellations?q=${encodeURIComponent(q)}`),
  createCancellation: (b: Record<string, unknown>) => call<Cancellation>("/contract-admin/cancellations", { method: "POST", body: JSON.stringify(b) }),
  moveCancellation: (id: string, stage: number) => call<Cancellation>(`/contract-admin/cancellations/${id}/stage`, { method: "PUT", body: JSON.stringify({ stage }) }),
  blocks: () => call<{ id: string; personName: string; days: number; userName: string; at: string }[]>("/contract-admin/delinquency/blocks"),
  searchDelinquency: (b: Record<string, unknown>) => call<unknown[]>("/contract-admin/delinquency/search", { method: "POST", body: JSON.stringify(b) }),
};
