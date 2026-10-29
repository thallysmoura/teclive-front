import { authFetch, ApiError } from "@/lib/api";

const KEY = (n: string) => `item_f1a2b3c4-0000-4d5e-8f60-bbbbbbbbbb${n}`;
export const FAT_KEYS = { central: KEY("02"), servicos: KEY("03"), contratos: KEY("04"), produtos: KEY("05"), os: KEY("06"), compras: KEY("07"), devolucao: KEY("08") };

export type Invoice = {
  id: string; number: number; kind: "S" | "P"; origin: "OS" | "CONTRATO" | "AVULSA"; originRef: string | null; personId: string | null; personName: string; competence: string;
  registeredAt: string; createdBy: string; total: number; titleGenerated: boolean; status: "FATURADA" | "CANCELADA"; nfseNumber: number | null; nfeNumber: string | null; description: string | null;
};
export type InvoiceList = { lista: Invoice[]; total: number; hasMore: boolean };
export type InvoiceDetail = Invoice & {
  person: { id: string; name: string; document: string | null; type: string; email: string | null; phone: string | null; address: string | null; sellerName: string | null } | null;
  order: { id: string; number: number; closedAt: string | null; services: number; products: number; seller: string | null; defect: string | null; address: string } | null;
  contract: { id: string; number: string; billingDay: number; totalNet: number; sellerName: string | null } | null;
  seller: string | null; operation: string;
  nfse: { rps: number; invoiceNumber: number; lote: string; nfseNumber: number; issuedAt: string; personName: string; total: number; status: "G" | "C" }[];
  nfe: { number: number; personName: string; status: "A" | "C" | "D"; issuedAt: string; kindLabel: string; invoiceNumber: number | null; exitDate: string | null; accessKey: string; total: number | null }[];
};
export type NfseRow = { rps: number; invoiceNumber: number; invoiceId: string | null; lote: string; nfseNumber: number; issuedAt: string; personName: string; total: number; status: "G" | "C" };
export type NfeRow = { number: number; personName: string; status: "A" | "C" | "D"; issuedAt: string; kindLabel: string; invoiceNumber: number | null; invoiceId: string | null; exitDate: string | null; accessKey: string; total: number | null };
export type Lot = { lote: string; count: number; total: number; issuedAt: string; cancelled: number };
export type ContractRow = { id: string; number: string; personId: string | null; personName: string; billingDay: number; total: number; group: string | null; billedInvoice: number | null };
export type OsRow = { key: string; orderId?: string; invoiceId?: string; invoiceNumber?: number; number: number; personName: string; address: string; kind: "S" | "P"; value: number };
export type Purchase = { id: string; number: string; supplierName: string; entryDate: string; issueDate: string; operation: string; total: number; status: "Salva" | "Lançada" | "Cancelada" };
export type ReturnNote = { id: string; number: number | null; date: string; personName: string; kindLabel: string; originNf: string; status: string };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => null);
  if (res.status === 401) throw new ApiError("Sessão expirada. Entre novamente.");
  if (!res.ok) throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível concluir a operação.");
  return body as T;
}
const qs = (o: Record<string, string | number | boolean | undefined | null>) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])).toString();
const post = (b: unknown) => ({ method: "POST", body: JSON.stringify(b) });
const put = (b: unknown) => ({ method: "PUT", body: JSON.stringify(b) });

export const billing = {
  invoices: (p: Record<string, string | number | boolean | undefined>) => call<InvoiceList>(`/billing/invoices?${qs(p)}`),
  invoice: (id: string) => call<InvoiceDetail>(`/billing/invoices/${id}`),
  editInvoice: (id: string, b: { description?: string; competence?: string }) => call<{ ok: boolean }>(`/billing/invoices/${id}`, put(b)),
  cancelInvoice: (id: string) => call<{ ok: boolean }>(`/billing/invoices/${id}/cancel`, { method: "POST" }),
  createInvoice: (b: unknown) => call<{ id: string; number: number }>("/billing/invoices", post(b)),
  nfse: (p: Record<string, string | number | boolean | undefined>) => call<{ lista: NfseRow[]; total: number; hasMore: boolean }>(`/billing/nfse?${qs(p)}`),
  nfe: (p: Record<string, string | number | boolean | undefined>) => call<{ lista: NfeRow[]; total: number; hasMore: boolean }>(`/billing/nfe?${qs(p)}`),
  processing: () => call<Lot[]>("/billing/processing"),
  exportXml: async (type: "nfse" | "nfe", from?: string, to?: string) => { const res = await authFetch(`/billing/export-xml?${qs({ type, from, to })}`); if (!res.ok) throw new ApiError("Não foi possível exportar."); return res.text(); },
  searchContracts: (p: Record<string, string | number | undefined>) => call<ContractRow[]>(`/billing/contracts/search?${qs(p)}`),
  invoiceContracts: (month: string, contractIds: string[]) => call<{ created: number[] }>("/billing/contracts/invoice", post({ month, contractIds })),
  orders: (p: Record<string, string | number | undefined>) => call<OsRow[]>(`/billing/os?${qs(p)}`),
  invoiceOrder: (orderId: string, kind: "S" | "P") => call<{ id: string; number: number }>("/billing/os/invoice", post({ orderId, kind })),
  purchases: (p: Record<string, string | undefined>) => call<Purchase[]>(`/billing/purchases?${qs(p)}`),
  savePurchase: (id: string | null, b: unknown) => call<Purchase>(id ? `/billing/purchases/${id}` : "/billing/purchases", id ? put(b) : post(b)),
  returns: (p: Record<string, string | undefined>) => call<ReturnNote[]>(`/billing/returns?${qs(p)}`),
  saveReturn: (id: string | null, b: unknown) => call<ReturnNote>(id ? `/billing/returns/${id}` : "/billing/returns", id ? put(b) : post(b)),
};

export const pad = (n: number | string, size = 6) => String(n).padStart(size, "0");
export const dateBr = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "");
export const OS_TYPES: Record<number, string> = { 1: "Instalação", 2: "Cancelamento", 3: "Manutenção Corretiva", 4: "Manutenção Preventiva" };
export const ORIGIN_LABEL = { OS: "Fatura de ordem de serviço", CONTRATO: "Fatura de contrato", AVULSA: "Fatura avulsa" } as const;
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
