import { ApiError, authFetch } from "./api";

export const CADASTROS_KEYS = {
  pessoas: "item_fbfee48c-aa73-4e12-ba11-17c0f42ec0ae",
  servicos: "item_7fe50f6f-33da-48c1-9b5a-124c2f07c7d7",
  produtos: "item_2aef5623-97de-41cb-82b3-343cd0ab30f8",
  marcas: "item_7d7eb456-b891-4619-b0cf-8e1252bce2e3",
  "grupos-produtos": "item_363a276e-6b59-4b99-a78c-d9069abc2990",
  "ramos-atividade": "item_036822b6-2466-4e4a-b910-546aa28d7e88",
} as const;

export type ListParams = { q?: string; exibirInativos?: boolean; page?: number; orderBy?: string; desc?: boolean; role?: string; type?: string; from?: string; until?: string };
export type Page<T> = { lista: T[]; totalRegistros: number; tamanhoPagina: number };

async function parse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(Array.isArray(data?.message) ? data.message.join(" ") : data?.message ?? fallback);
  }
  return res.json();
}

const json = (method: string, body?: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

/** Cliente REST padrão dos cadastros (listar, obter, criar, alterar, ativar/inativar, excluir). */
export function crud<T extends { id: string }, Input = Partial<T>>(base: string, options: { updateMethod?: "PUT" | "PATCH" } = {}) {
  return {
    async list(params: ListParams = {}): Promise<Page<T>> {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "" && value !== false) query.set(key, String(value));
      return parse(await authFetch(`${base}?${query}`, { cache: "no-store" }), "Não foi possível carregar a listagem.");
    },
    async get(id: string): Promise<T | null> {
      const res = await authFetch(`${base}/${id}`, { cache: "no-store" });
      if (res.status === 404) return null;
      return parse(res, "Não foi possível carregar o registro.");
    },
    create: async (input: Input): Promise<T> => parse(await authFetch(base, json("POST", input)), "Não foi possível salvar."),
    update: async (id: string, input: Input): Promise<T> => parse(await authFetch(`${base}/${id}`, json(options.updateMethod ?? "PUT", input)), "Não foi possível salvar."),
    setActive: async (id: string, active: boolean): Promise<T> => parse(await authFetch(`${base}/${id}/${active ? "activate" : "inactivate"}`, json("POST")), "Não foi possível alterar o status."),
    remove: async (id: string): Promise<void> => { await parse(await authFetch(`${base}/${id}`, json("DELETE")), "Não foi possível excluir."); },
  };
}

export type CatalogKind = "brands" | "product-groups" | "activity-branches";
export type CatalogItem = { id: string; description: string; isActive: boolean };

/** Marcas, grupos e ramos: a API devolve tudo; paginamos no cliente (20 por página). */
export function catalogClient(kind: CatalogKind) {
  const client = crud<CatalogItem, { description: string }>(`/catalogs/${kind}`, { updateMethod: "PATCH" });
  return {
    ...client,
    stats: async (): Promise<CatalogStats> => parse(await authFetch(`/catalogs/${kind}/stats`, { cache: "no-store" }), "Não foi possível carregar os indicadores."),
    async list(params: ListParams = {}): Promise<Page<CatalogItem>> {
      const query = new URLSearchParams();
      if (params.q) query.set("descricao", params.q);
      if (params.exibirInativos) query.set("exibirInativos", "true");
      if (params.desc) query.set("decrescente", "true");
      if (params.orderBy === "isActive") query.set("ordenarPor", "isActive");
      const all = await parse<{ lista: CatalogItem[] }>(await authFetch(`/catalogs/${kind}?${query}`, { cache: "no-store" }), "Não foi possível carregar a listagem.");
      const page = Math.max(1, params.page ?? 1);
      return { lista: all.lista.slice((page - 1) * 20, page * 20), totalRegistros: all.lista.length, tamanhoPagina: 20 };
    },
  };
}

export type ServiceItem = { id: string; description: string; category: string | null; modality: number; allowsRental: boolean; blocksOnDelinquency: boolean; cost: string; margin: string; price: string; isActive: boolean };
export type ServiceInput = { description: string; category: string; modality: number; allowsRental: boolean; blocksOnDelinquency: boolean; cost: number; margin: number; price: number };
export type Datum = { label: string; value: number };
export type ProductStats = { total: number; active: number; inactive: number; averagePrice: number; averageMargin: number; stockValue: number; potentialProfit: number; withStock: number; withoutStock: number; byGroup: Datum[]; byBrand: Datum[]; stockByGroup: Datum[]; priceRanges: Datum[]; monthly: Datum[] };
export type CatalogStats = { total: number; active: number; inactive: number; used: number; unused: number; top: Datum[]; stockByItem: Datum[]; usageLabel: string };
export type ServiceStats = { total: number; active: number; inactive: number; contracts: number; workOrders: number; averagePrice: number; averageMargin: number; averageProfit: number; topService: { description: string; price: number } | null; categories: Datum[]; priceRanges: Datum[]; monthly: Datum[] };
export type PeopleStats = { total: number; active: number; inactive: number; physical: number; legal: number; newLast30Days: number; withDocumentPct: number; withContactPct: number; roles: Datum[]; monthly: Datum[] };

export const servicesClient = {
  ...crud<ServiceItem, ServiceInput>("/services"),
  stats: async (): Promise<ServiceStats> => parse(await authFetch("/services/stats", { cache: "no-store" }), "Não foi possível carregar os indicadores."),
  categories: async (): Promise<string[]> => parse(await authFetch("/services/categories", { cache: "no-store" }), "Não foi possível carregar as categorias."),
};

export type Product = { id: string; description: string; brand: string; productGroup: string; unit: string; model: string | null; alternativeDescription: string | null; identifier: string | null; supplierCode: string | null; barcode: string | null; allowNegativeStock: boolean; allowRental: boolean; costPrice: string | null; margin: string | null; salePrice: string | null; isActive: boolean };
export type ProductInput = { description: string; unit: string; productGroup: string; brand: string; model: string; alternativeDescription: string; identifier: string; supplierCode: string; barcode: string; allowNegativeStock: boolean; allowRental: boolean; costPrice: number; margin: number; salePrice: number };
export const productsClient = {
  ...crud<Product, ProductInput>("/products"),
  stats: async (): Promise<ProductStats> => parse(await authFetch("/products/stats", { cache: "no-store" }), "Não foi possível carregar os indicadores."),
  units: async (): Promise<{ code: string; name: string }[]> => parse(await authFetch("/products/units", { cache: "no-store" }), "Não foi possível carregar as unidades."),
};

export type Person = { id: string; type: "F" | "J"; document: string | null; name: string; nickname: string | null; rg: string | null; identifier: string | null; isClient: boolean; isSupplier: boolean; isEmployee: boolean; isTechnician: boolean; isCarrier: boolean; isSeller: boolean; taxpayerType: number | null; isFinalConsumer: boolean; municipalRegistration: string | null; stateRegistration: string | null; email: string | null; phone: string | null; isActive: boolean; isLead?: boolean; sellerName?: string | null; becameClientAt?: string | null };
export type PersonInput = Omit<Person, "id" | "isActive" | "document" | "taxpayerType"> & { document: string; taxpayerType: number | null };
export const peopleClient = {
  ...crud<Person, PersonInput>("/people"),
  stats: async (): Promise<PeopleStats> => parse(await authFetch("/people/stats", { cache: "no-store" }), "Não foi possível carregar os indicadores."),
};

export const PERSON_ROLES = [
  ["isClient", "Cliente"], ["isSupplier", "Fornecedor"], ["isEmployee", "Funcionário"], ["isTechnician", "Técnico"], ["isCarrier", "Transportador"], ["isSeller", "Vendedor"],
] as const;
export const roleLabels = (p: Person) => PERSON_ROLES.filter(([key]) => p[key]).map(([, label]) => label).join(", ") || "—";

export const formatDocument = (value: string | null) => {
  const d = (value ?? "").replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value || "Não informado";
};
export const maskDocument = (value: string, type: "F" | "J") => {
  const d = value.replace(/\D/g, "").slice(0, type === "J" ? 14 : 11);
  return type === "J"
    ? d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2")
    : d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
export const money = (value: number | string | null) => Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const toNumber = (value: string) => Number(value.replace(/\./g, "").replace(",", ".")) || 0;
export const toInput = (value: number | string | null) => Number(value ?? 0).toFixed(2).replace(".", ",");

/** Descrições ativas de um cadastro simples (todas, sem paginação) — usado em selects e filtros. */
export async function catalogNames(kind: CatalogKind): Promise<string[]> {
  const data = await parse<{ lista: CatalogItem[] }>(await authFetch(`/catalogs/${kind}`, { cache: "no-store" }), "Não foi possível carregar a lista.");
  return data.lista.map((i) => i.description);
}
