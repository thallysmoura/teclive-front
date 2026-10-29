import { authFetch, ApiError } from "@/lib/api";

const KEY = (n: string) => `item_f2b3c4d5-0000-4d5e-8f60-cccccccccc${n}`;
export const FIN_KEYS = { receber: KEY("02"), pagar: KEY("03"), movimento: KEY("04"), boletos: KEY("05"), cartoes: KEY("06"), titulos: KEY("07"), renegociar: KEY("08"), reparcelamento: KEY("09"), formas: KEY("10"), caixas: KEY("11"), categorias: KEY("12"), analise: KEY("13"), extrato: KEY("14"), cobranca: KEY("15"), centros: KEY("16"), resultadoCliente: KEY("17") };

export type FinAccount = { id: string; kind: "R" | "P"; number: string | null; dueDate: string; personName: string; installment: string | null; description: string; value: number; paidValue: number | null; status: "ABERTA" | "LIQUIDADA" | "CANCELADA"; paymentMethod: string | null; categoryId: string | null; invoiceNumber: number | null; note: string | null };
export type AccountList = { lista: FinAccount[]; total: number; hasMore: boolean; totals: { value: number; paid: number; open: number } };
export type CashAccount = { id: string; name: string; type: string; isActive: boolean; balance: number };
export type Movement = { id: string; date: string; personName: string; description: string; value: number; balance: number };
export type Category = { id: string; kind: "D" | "R"; name: string; level: number; parentId: string | null; isActive: boolean };
export type Method = { id: string; description: string; isActive: boolean };
export type Center = { id: string; name: string; isActive: boolean };
export type Debtor = { personName: string; count: number; total: number; oldest: string; daysLate: number; lastCollection: string | null };
export type Operation = { id: string; type: string; personName: string; description: string; total: number; userName: string; createdAt: string };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => null);
  if (res.status === 401) throw new ApiError("Sessão expirada. Entre novamente.");
  if (!res.ok) throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível concluir a operação.");
  return body as T;
}
type Q = Record<string, string | number | boolean | undefined | null>;
const qs = (o: Q) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])).toString();
const post = (b?: unknown) => ({ method: "POST", body: JSON.stringify(b ?? {}) });
const put = (b: unknown) => ({ method: "PUT", body: JSON.stringify(b) });

export const fin = {
  accounts: (p: Q) => call<AccountList>(`/finance/accounts?${qs(p)}`),
  createAccount: (b: unknown) => call<{ created: string[] }>("/finance/accounts", post(b)),
  updateAccount: (id: string, b: unknown) => call<{ ok: boolean }>(`/finance/accounts/${id}`, put(b)),
  deleteAccount: (id: string) => call<{ ok: boolean }>(`/finance/accounts/${id}`, { method: "DELETE" }),
  settle: (id: string, b: unknown) => call<{ ok: boolean }>(`/finance/accounts/${id}/settle`, post(b)),
  reverse: (id: string) => call<{ ok: boolean }>(`/finance/accounts/${id}/reverse`, post()),
  cashAccounts: (inactive = false) => call<CashAccount[]>(`/finance/cash-accounts?inactive=${inactive}`),
  saveCash: (id: string | null, b: unknown) => call<CashAccount>(id ? `/finance/cash-accounts/${id}` : "/finance/cash-accounts", id ? put(b) : post(b)),
  movements: (p: Q) => call<{ lista: Movement[]; total: number; pageSize: number; daily: { date: string; balance: number }[] }>(`/finance/movements?${qs(p)}`),
  createMovement: (b: unknown) => call<{ ok: boolean }>("/finance/movements", post(b)),
  statement: (p: Q) => call<{ lista: { id: string; date: string; account: string; personName: string; description: string; value: number; user: string }[]; inflow: number; outflow: number }>(`/finance/statement?${qs(p)}`),
  categories: () => call<Category[]>("/finance/categories"),
  createCategory: (b: unknown) => call<Category>("/finance/categories", post(b)),
  updateCategory: (id: string, b: unknown) => call<Category>(`/finance/categories/${id}`, put(b)),
  deleteCategory: (id: string) => call<{ ok: boolean }>(`/finance/categories/${id}`, { method: "DELETE" }),
  methods: (inactive = false) => call<Method[]>(`/finance/payment-methods?inactive=${inactive}`),
  saveMethod: (id: string | null, b: unknown) => call<Method>(id ? `/finance/payment-methods/${id}` : "/finance/payment-methods", id ? put(b) : post(b)),
  centers: (inactive = false) => call<Center[]>(`/finance/result-centers?inactive=${inactive}`),
  saveCenter: (id: string | null, b: unknown) => call<Center>(id ? `/finance/result-centers/${id}` : "/finance/result-centers", id ? put(b) : post(b)),
  analysis: (year: number) => call<{ year: number; receipts: { name: string; planned: number[]; done: number[] }[]; payments: { name: string; planned: number[]; done: number[] }[] }>(`/finance/result-analysis?year=${year}`),
  byClient: (p: Q) => call<{ client: string; recurrence: number; maintenance: number; travel: number; allocation: number; bonus: number; result: number }[]>(`/finance/result-by-client?${qs(p)}`),
  collectionSearch: (p: Q) => call<Debtor[]>(`/finance/collections/search?${qs(p)}`),
  collections: () => call<{ id: string; personName: string; note: string; userName: string; total: number; createdAt: string }[]>("/finance/collections"),
  collect: (b: unknown) => call<unknown>("/finance/collections", post(b)),
  operations: () => call<Operation[]>("/finance/operations"),
  operate: (b: unknown) => call<{ ok: boolean }>("/finance/operations", post(b)),
};

export const dateBr = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "");
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const num = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
