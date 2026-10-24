import { ApiError, authFetch } from "./api";
import { crud, type Datum, type Page, type Person, type PersonInput } from "./cadastros";

export const COMERCIAL_KEYS = {
  orcamentos: "item_bfdf24cd-79ea-4f78-9127-dc43732a6c71",
  prospects: "item_e6070c45-e169-4cc1-814f-80d91c21be2c",
  motivos: "item_d750d051-6fd1-4ed4-9286-8dd86f8874a7",
  acoes: "item_950059f2-6d18-4ece-95cf-30602eb507ec",
  agenda: "item_cf02a90c-edca-4314-8d72-8d6e13be7ceb",
  modelos: "item_4a07fbaa-c885-4f68-a628-b180a083e70b",
  templates: "item_d157135f-1bc6-405c-a6e5-5eaac0a32914",
} as const;

async function parse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(Array.isArray(data?.message) ? data.message.join(" ") : data?.message ?? fallback);
  }
  return res.json();
}
const send = (method: string, body?: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

/* ---------- Orçamentos ---------- */

export const QUOTE_STATUS: Record<number, { label: string; className: string }> = {
  1: { label: "Cancelado", className: "bg-ds-danger-bg text-ds-danger-text" },
  2: { label: "Recusado", className: "bg-ds-danger-bg text-ds-danger-text" },
  3: { label: "Aberto", className: "bg-ds-warning/25 text-ds-warning-text" },
  4: { label: "Liberado", className: "bg-ds-info/15 text-ds-info" },
  6: { label: "Vencido", className: "bg-ds-border-subtle text-ds-text-muted" },
  7: { label: "OS Aberta", className: "bg-ds-primary-deep text-white" },
  8: { label: "Concluído", className: "bg-ds-success/15 text-ds-success" },
};
export const QUOTE_STATUS_OPTIONS = [3, 4, 6, 7, 8, 1, 2];
export const modalityLabel = (modality: number) => (modality === 1 ? "Locação" : "Venda");
export const formatQuoteNumber = (n: number) => `${String(Math.floor(n / 1000)).padStart(3, "0")}.${String(n % 1000).padStart(3, "0")}`;

export type QuoteRow = {
  id: string; number: number; title: string | null; personName: string; personNickname: string | null; personIsLead: boolean; personId: string | null;
  sellerName: string | null; modality: number; status: number; openedAt: string; validUntil: string; total: number; recurring: number; refusalReason: string | null;
};
export type QuoteItem = { id: string; kind: "PRODUCT" | "SERVICE" | "RECURRING"; description: string; identifier: string | null; unit: string | null; quantity: string; unitValue: string; discountValue: string; discountPercent: string; total: string; cost: string; rental: boolean };
export type QuotePayment = { id: string; method: string; installments: number; total: string; selected: boolean };
export type QuoteHistoryRow = { id: string; userName: string; description: string; at: string };
export type QuoteAttachment = { id: string; fileName: string; caption: string | null; mimeType: string; size: number; userName: string; createdAt: string };
export type QuoteTotals = { products: number; services: number; recurring: number; total: number; discount: number; gross: number; cost: number };
export type QuoteDetail = {
  id: string; number: number; title: string | null; personId: string | null; personName: string; personNickname: string | null; personDocument: string | null; personType: string; personIsLead: boolean;
  sellerName: string | null; status: number; purpose: number; modality: number; openedAt: string; validUntil: string; wonAt: string | null; releasedAt: string | null; cancelledAt: string | null;
  refusalReason: string | null; technicalSheet: string | null; notes: string | null; showNotes: boolean; contactName: string | null; contactEmail: string | null; contactPhone: string | null;
  address: { titulo?: string; cidade?: string; cep?: string; logradouro?: string; bairro?: string; complemento?: string | null; numero?: string; uf?: string } | null;
  openedBy: string; items: QuoteItem[]; payments: QuotePayment[]; history: QuoteHistoryRow[]; attachments: QuoteAttachment[]; totals: QuoteTotals;
};
export type QuoteListParams = { q?: string; from?: string; until?: string; status?: string; modality?: string; personType?: string; seller?: string; reason?: string; hideCancelled?: boolean; page?: number; orderBy?: string; desc?: boolean };
export type QuoteStats = {
  total: number; openCount: number; openValue: number; wonCount: number; wonValue: number; averageTicket: number; conversionRate: number; recurringValue: number;
  statuses: Datum[]; monthlyCount: Datum[]; monthlyWon: Datum[]; bySeller: Datum[]; topClients: Datum[];
};
export type QuoteItemInput = { kind: "PRODUCT" | "SERVICE" | "RECURRING"; description: string; identifier?: string; unit?: string; quantity: number; unitValue: number; discountValue?: number; cost?: number; rental?: boolean };
export type QuoteInput = { personId?: string; title?: string; validUntil?: string; sellerName?: string; contactName?: string; contactEmail?: string; contactPhone?: string; technicalSheet?: string; notes?: string; showNotes?: boolean; address?: Record<string, string> };

const action = async (path: string, body?: unknown) => parse<QuoteDetail>(await authFetch(path, send("POST", body)), "Não foi possível concluir a operação.");

export const quotesClient = {
  async list(params: QuoteListParams = {}): Promise<Page<QuoteRow> & { totalValue: number }> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "" && value !== false) query.set(key, String(value));
    return parse(await authFetch(`/quotes?${query}`, { cache: "no-store" }), "Não foi possível carregar os orçamentos.");
  },
  stats: async (): Promise<QuoteStats> => parse(await authFetch("/quotes/stats", { cache: "no-store" }), "Não foi possível carregar os indicadores."),
  filters: async (): Promise<{ sellers: string[]; reasons: string[] }> => parse(await authFetch("/quotes/filters", { cache: "no-store" }), "Não foi possível carregar os filtros."),
  async get(id: string): Promise<QuoteDetail | null> {
    const res = await authFetch(`/quotes/${id}`, { cache: "no-store" });
    if (res.status === 404) return null;
    return parse(res, "Não foi possível carregar o orçamento.");
  },
  create: async (input: QuoteInput) => parse<{ id: string; number: number }>(await authFetch("/quotes", send("POST", input)), "Não foi possível criar o orçamento."),
  update: async (id: string, input: QuoteInput) => parse<QuoteDetail>(await authFetch(`/quotes/${id}`, send("PUT", input)), "Não foi possível salvar o orçamento."),
  addItem: async (id: string, input: QuoteItemInput) => action(`/quotes/${id}/items`, input),
  updateItem: async (id: string, itemId: string, input: Partial<QuoteItemInput>) => parse<QuoteDetail>(await authFetch(`/quotes/${id}/items/${itemId}`, send("PUT", input)), "Não foi possível salvar o item."),
  addAttachment: async (id: string, file: File, caption: string) => {
    const buffer = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
    return parse<QuoteDetail>(await authFetch(`/quotes/${id}/attachments`, send("POST", { fileName: file.name, caption, mimeType: file.type, fileBase64: btoa(binary) })), "Não foi possível anexar o arquivo.");
  },
  removeAttachment: async (id: string, attachmentId: string) => parse<QuoteDetail>(await authFetch(`/quotes/${id}/attachments/${attachmentId}`, send("DELETE")), "Não foi possível remover o anexo."),
  downloadAttachment: async (id: string, a: QuoteAttachment) => {
    const res = await authFetch(`/quotes/${id}/attachments/${a.id}/file`);
    if (!res.ok) throw new ApiError("Não foi possível baixar o anexo.");
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = url; link.download = a.fileName; link.click();
    URL.revokeObjectURL(url);
  },
  removeItem: async (id: string, itemId: string) => parse<QuoteDetail>(await authFetch(`/quotes/${id}/items/${itemId}`, send("DELETE")), "Não foi possível remover o item."),
  addPayment: async (id: string, input: { method: string; installments: number }) => action(`/quotes/${id}/payments`, input),
  removePayment: async (id: string, paymentId: string) => parse<QuoteDetail>(await authFetch(`/quotes/${id}/payments/${paymentId}`, send("DELETE")), "Não foi possível remover a forma de pagamento."),
  win: (id: string, paymentId: string) => action(`/quotes/${id}/win`, { paymentId }),
  refuse: (id: string, reason: string) => action(`/quotes/${id}/refuse`, { reason }),
  openWorkOrder: (id: string) => action(`/quotes/${id}/open-work-order`),
  cancel: (id: string) => action(`/quotes/${id}/cancel`),
  duplicate: async (id: string) => parse<{ id: string }>(await authFetch(`/quotes/${id}/duplicate`, send("POST")), "Não foi possível duplicar o orçamento."),
  setModality: (id: string, modality: number) => action(`/quotes/${id}/modality`, { modality }),
};

/* ---------- Prospects (leads) ---------- */

export type LeadStats = { total: number; active: number; converted: number; withQuotes: number; withoutQuotes: number; pipelineValue: number; withoutSeller: number; physical: number; legal: number; bySeller: Datum[] };
export type ClientOption = { id: string; name: string; nickname: string | null; document: string | null; isLead: boolean; type: string; sellerName: string | null };
export const leadsClient = {
  ...crud<Person, Partial<PersonInput> & { sellerName?: string }>("/leads"),
  stats: async (): Promise<LeadStats> => parse(await authFetch("/leads/stats", { cache: "no-store" }), "Não foi possível carregar os indicadores."),
  convert: async (id: string) => parse<Person>(await authFetch(`/leads/${id}/convert`, send("POST")), "Não foi possível converter o lead."),
  options: async (q?: string): Promise<ClientOption[]> => parse(await authFetch(`/leads/options?q=${encodeURIComponent(q ?? "")}`, { cache: "no-store" }), "Não foi possível buscar os clientes."),
};
export const sellersClient = { list: async (): Promise<{ id: string; name: string }[]> => parse(await authFetch("/people/sellers", { cache: "no-store" }), "Não foi possível carregar os vendedores.") };

/* ---------- Motivos de recusa, ações de venda, modelos, templates, agenda ---------- */

export type RefusalReason = { id: string; description: string; usedWhen: "CLIENT" | "MANAGEMENT"; isActive: boolean; timesUsed?: number };
export const refusalClient = crud<RefusalReason, { description: string; usedWhen: string }>("/refusal-reasons");

export type SalesAction = { id: string; personId: string | null; personName: string; title: string; actionDate: string; durationHours: string; channel: string; supportTeam: string | null; description: string | null; isActive: boolean };
export type SalesActionInput = { personId: string; title: string; actionDate: string; durationHours: number; channel: string; supportTeam: string; description: string };
export type SalesActionStats = { total: number; thisMonth: number; hours: number; people: number; byChannel: Datum[]; monthly: Datum[] };
export const salesActionsClient = {
  ...crud<SalesAction, SalesActionInput>("/sales-actions"),
  stats: async (): Promise<SalesActionStats> => parse(await authFetch("/sales-actions/stats", { cache: "no-store" }), "Não foi possível carregar os indicadores."),
};
export const CHANNELS = ["Telefone", "WhatsApp", "E-mail", "Visita presencial", "Reunião online", "Outro"];
export const SUPPORT_TEAMS = ["Comercial", "Técnica", "Financeiro", "Projetos"];

export type QuoteModel = { id: string; description: string; isActive: boolean };
const modelsBase = crud<QuoteModel, { description: string }>("/quote-models", { updateMethod: "PATCH" });
export const quoteModelsClient = {
  ...modelsBase,
  list: async (params: Parameters<typeof modelsBase.list>[0] = {}) => {
    const r = await modelsBase.list(params);
    return { ...r, lista: r.lista.map((m) => ({ ...m, isActive: true })) };
  },
  setActive: async (_id: string, _active: boolean) => undefined,
};

export type QuoteTemplate = { id: string; description: string; fileName: string; isActive: boolean; createdAt: string };
export const templatesClient = {
  ...crud<QuoteTemplate, { description: string }>("/quote-templates", { updateMethod: "PATCH" }),
  upload: async (description: string, file: File): Promise<QuoteTemplate> => {
    const buffer = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
    return parse(await authFetch("/quote-templates", send("POST", { description, fileName: file.name, fileBase64: btoa(binary) })), "Não foi possível enviar o template.");
  },
  download: async (t: QuoteTemplate) => {
    const res = await authFetch(`/quote-templates/${t.id}/file`);
    if (!res.ok) throw new ApiError("Não foi possível baixar o template.");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url; a.download = t.fileName; a.click();
    URL.revokeObjectURL(url);
  },
};

export type CalendarEvent = { id: string; title: string; startsAt: string; endsAt: string; allDay: boolean; description: string | null; ownerName: string; ownerId: string | null };
export type CalendarEventInput = { title: string; startsAt: string; endsAt: string; allDay: boolean; description: string };
export const eventsClient = {
  list: async (from: string, until: string, owners: string[]): Promise<CalendarEvent[]> => {
    const query = new URLSearchParams({ from, until });
    if (owners.length) query.set("owners", owners.join(","));
    return parse(await authFetch(`/calendar-events?${query}`, { cache: "no-store" }), "Não foi possível carregar a agenda.");
  },
  owners: async (): Promise<{ id: string; name: string }[]> => parse(await authFetch("/calendar-events/owners", { cache: "no-store" }), "Não foi possível carregar os usuários."),
  create: async (input: CalendarEventInput) => parse<CalendarEvent>(await authFetch("/calendar-events", send("POST", input)), "Não foi possível salvar o evento."),
  update: async (id: string, input: CalendarEventInput) => parse<CalendarEvent>(await authFetch(`/calendar-events/${id}`, send("PUT", input)), "Não foi possível salvar o evento."),
  remove: async (id: string) => { await parse(await authFetch(`/calendar-events/${id}`, send("DELETE")), "Não foi possível excluir o evento."); },
};
