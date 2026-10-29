import { ApiError, authFetch } from "./api";
import { crud } from "./cadastros";

export const OPERACIONAL_KEYS = {
  andamento: "item_8b3f5bf8-ffb3-4f0a-a4a4-4a4698ef325e",
  ordens: "item_155297fd-ffca-4f14-b809-c3edc613cdeb",
  gestao: "item_2327997e-8c56-4b39-9061-deeb77030e7a",
  causas: "item_afef44e7-23fc-4b47-b0ff-7963a31bc09e",
  defeitos: "item_ccb96198-7b06-4f45-928f-231145d36980",
  solucoes: "item_80cebafc-51d1-4213-be91-d1401f9c10d4",
  agenda: "item_390c9e82-66a2-4ef1-a945-ff79df43c90f",
  central: "item_621fb042-62c7-4c32-a867-0ec5e9c88ed0",
  questionarios: "item_67b4bc35-df8b-4f47-b95b-a7f4d4b11627",
} as const;

async function parse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(Array.isArray(data?.message) ? data.message.join(" ") : data?.message ?? fallback);
  }
  return res.json();
}
const send = (method: string, body?: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

/* ---------- Cadastros simples ---------- */

export type OpCause = { id: string; description: string; isActive: boolean; timesUsed: number };
export type OpSolution = OpCause;
export type OpDefect = OpCause & { serviceMinutes: number; closingMinutes: number };
export type OpQuestionnaire = { id: string; title: string; description: string | null; questionCount: number; isActive: boolean; timesUsed: number };

export const causeClient = crud<OpCause, { description: string }>("/op/causes");
export const solutionClient = crud<OpSolution, { description: string }>("/op/solutions");
export const defectClient = crud<OpDefect, { description: string; serviceMinutes: number; closingMinutes: number }>("/op/defects");
export const questionnaireClient = crud<OpQuestionnaire, { title: string; description: string; questionCount: number }>("/op/questionnaires");

/** 90 min → "1h30"; 2880 → "48h". */
export function formatMinutes(total: number) {
  const h = Math.floor(total / 60), m = total % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/* ---------- Ordens de serviço ---------- */

export const OS_STATUS: Record<number, { label: string; className: string }> = {
  0: { label: "Aberta", className: "bg-ds-warning/25 text-ds-warning-text" },
  1: { label: "Em atraso", className: "bg-ds-danger-bg text-ds-danger-text" },
  2: { label: "Cancelada", className: "bg-ds-danger-bg text-ds-danger-text" },
  3: { label: "Interrompida", className: "bg-ds-border-subtle text-ds-text-muted" },
  4: { label: "Fechada", className: "bg-ds-info/15 text-ds-info" },
  5: { label: "Faturada", className: "bg-ds-success/15 text-ds-success" },
  6: { label: "Faturada Parcialmente", className: "bg-ds-success/15 text-ds-success" },
  7: { label: "Aguardando Aprovação", className: "bg-ds-warning/25 text-ds-warning-text" },
  8: { label: "Em Atendimento", className: "bg-ds-primary-deep text-white" },
};
export const OS_TYPES: Record<number, string> = { 1: "Instalação", 2: "Cancelamento", 3: "Manutenção Corretiva", 4: "Manutenção Preventiva" };
export const formatOsNumber = (n: number) => `${String(Math.floor(n / 1000)).padStart(3, "0")}.${String(n % 1000).padStart(3, "0")}`;

export type OsAddress = { titulo?: string; cidade?: string; cep?: string; logradouro?: string; bairro?: string; complemento?: string | null; numero?: string | null; uf?: string; coordenada?: { latitude: number; longitude: number } };
export const addressLine = (a: OsAddress | null | undefined) => a ? [[a.logradouro, a.numero].filter(Boolean).join(", "), a.bairro, [a.cidade, a.uf].filter(Boolean).join(" - ")].filter(Boolean).join(" · ") : "";

export type OsRow = {
  id: string; number: number; type: number; typeLabel: string; status: number; statusLabel: string; defect: string | null; personName: string; personNickname: string | null; address: OsAddress | null;
  openedAt: string; closedAt: string | null; cancelledAt: string | null; scheduleStart: string | null; scheduleEnd: string | null; technicians: string[]; sellers: string[]; quoteNumbers: number[];
  total: number; pendencies: number; attachments: number;
};
export type OsItem = { ordemServicoItemId: number; quantidade: number; quantidadeEntregue?: number; cobrado?: boolean; valores?: { unitario?: number; total?: number; desconto?: { valor?: number } | number }; servico?: { descricao: string }; produto?: { descricao: string; identificador?: string; unidadeMedida?: string }; orcamento?: { numero: number } | null };
export type OsComment = { id?: string; tipo: number; conteudo: string | null; dataRegistro: string; usuario: string; usuarioId?: string; editadoEm?: string; avatarUrl?: string | null; anexos?: { id: string; fileName: string; mimeType: string; size: number; url?: string }[] };
export type OsDetail = OsRow & {
  purpose: number; openedBy: string; interruptedAt: string | null; contact: { nome?: string; email?: string | null; telefone?: string | null } | null; technicalSheet: string | null; cause: string | null; solution: string | null;
  paymentMethod: string | null; installments: number | null; totalServices: number; totalProducts: number; personId: string | null;
  services: OsItem[]; products: OsItem[]; toWithdraw: OsItem[];
  calls: { atendimentoId: number; descricao?: string; dataHoraInicio?: string; dataHoraFim?: string; duracaoEmMinutos?: number; registro?: { nomeUsuario?: string } }[];
  events: OsComment[];
  history: { dataHora: string; descricao: string; nomeUsuario: string; isLog: boolean }[];
  attachments: { ordemServicoArquivoId: number; nomeArquivo: string; extensaoArquivo: string; legenda: string | null; nomeUsuario: string; dataAnexo: string; url: string }[];
  advances: { numeroConta: string; parcela: number; dataVencimento: string; valor: number; status: number; formaPagamento?: { descricao: string } }[];
  questionnaires: { titulo: string; quantidadePerguntas: number; quantidadePerguntasRespondidas: number }[];
  billing: { quantidadeParcelas?: number; formaPagamento?: { descricao: string } | null } | null; pendingList: { mensagem: string; tipoPendencia: number }[]; durationMinutes: number;
};
export type OsListParams = { q?: string; from?: string; until?: string; status?: string; type?: string; technician?: string; seller?: string; defect?: string; cause?: string; solution?: string; hideCancelled?: boolean; page?: number; orderBy?: string; desc?: boolean };
export type OsFilters = { defects: string[]; causes: string[]; solutions: string[]; technicians: string[]; sellers: string[]; statuses: { value: string; label: string }[]; types: { value: string; label: string }[] };
export type OsInput = { personId?: string; type?: number; defectName?: string; scheduleStart?: string; scheduleEnd?: string; technicians?: string[]; technicalSheet?: string; address?: Partial<OsAddress> };
export type OsStats = { total: number; byStatus: Record<string, number>; value: number };
export type BoardColumn = { key: string; title: string; kind: "quote" | "os" | "bill"; cards: { orderId?: string; closedAt?: string | null; kind?: "S" | "P"; motivo?: number; id: string; number: number; personName: string; title?: string; wonAt?: string; openedAt?: string; scheduleEnd?: string | null; typeLabel?: string; total?: number; status?: number }[] };
export type OperationsData = { stats: { open: number; late: number; withoutTech: number; withoutSchedule: number }; points: (OsRow & { lat: number | null; lng: number | null })[] };
export type OsOptions = { causes: string[]; defects: { description: string; serviceMinutes: number; closingMinutes: number }[]; solutions: string[]; technicians: string[]; sellers: string[] };

const qs = (params: Record<string, unknown>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== false) q.set(k, String(v));
  return q.toString();
};

export const osClient = {
  async list(params: OsListParams = {}): Promise<{ lista: OsRow[]; totalRegistros: number; tamanhoPagina: number }> { return parse(await authFetch(`/service-orders?${qs(params)}`, { cache: "no-store" }), "Não foi possível carregar as ordens de serviço."); },
  async get(id: string): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}`, { cache: "no-store" }), "Não foi possível carregar a ordem de serviço."); },
  async stats(): Promise<OsStats> { return parse(await authFetch("/service-orders/stats", { cache: "no-store" }), "Não foi possível carregar os indicadores."); },
  async filters(): Promise<OsFilters> { return parse(await authFetch("/service-orders/filters", { cache: "no-store" }), "Não foi possível carregar os filtros."); },
  async board(): Promise<BoardColumn[]> { return parse(await authFetch("/service-orders/board", { cache: "no-store" }), "Não foi possível carregar o andamento."); },
  async schedule(from: string, until: string): Promise<OsRow[]> { return parse(await authFetch(`/service-orders/schedule?${qs({ from, until })}`, { cache: "no-store" }), "Não foi possível carregar a agenda."); },
  async operations(): Promise<OperationsData> { return parse(await authFetch("/service-orders/operations", { cache: "no-store" }), "Não foi possível carregar a central."); },
  async create(input: OsInput): Promise<OsDetail> { return parse(await authFetch("/service-orders", send("POST", input)), "Não foi possível abrir a OS."); },
  async setTechnicalSheet(id: string, text: string | null): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}/technical-sheet`, send("PUT", { text })), "Não foi possível alterar a ficha técnica."); },
  async update(id: string, input: OsInput): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}`, send("PUT", input)), "Não foi possível salvar a OS."); },
  async comment(id: string, input: { text: string; fileIds?: string[] }): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}/comments`, send("POST", input)), "Não foi possível comentar."); },
  async editComment(id: string, eventId: string, text: string): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}/comments/${eventId}`, send("PUT", { text })), "Não foi possível editar o comentário."); },
  async deleteComment(id: string, eventId: string): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}/comments/${eventId}`, send("DELETE")), "Não foi possível excluir o comentário."); },
  async comments(id: string): Promise<OsComment[]> { return parse(await authFetch(`/service-orders/${id}/comments`, { cache: "no-store" }), "Não foi possível atualizar os comentários."); },
  async uploadImage(id: string, file: { fileName: string; mimeType: string; fileBase64: string }): Promise<{ id: string; fileName: string; mimeType: string; size: number }> { return parse(await authFetch(`/service-orders/${id}/files`, send("POST", file)), "Não foi possível enviar a imagem."); },
  /** Baixa a imagem com a sessão do usuário e devolve uma URL local para exibir. */
  async imageUrl(id: string, fileId: string): Promise<string> {
    const res = await authFetch(`/service-orders/${id}/files/${fileId}`, { cache: "force-cache" });
    if (!res.ok) throw new ApiError("Não foi possível carregar a imagem.");
    return URL.createObjectURL(await res.blob());
  },
  async addItem(id: string, input: { kind: "service" | "product"; description: string; quantity: number; unitValue: number; discount?: number }): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}/items`, send("POST", input)), "Não foi possível adicionar o item."); },
  async removeItem(id: string, itemId: number): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}/items/${itemId}`, send("DELETE")), "Não foi possível remover o item."); },
  async deliver(id: string, itemId: number, quantity?: number): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}/items/${itemId}/deliver`, send("POST", { quantity })), "Não foi possível registrar a entrega."); },
  async close(id: string, input: { cause?: string; solution?: string }): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}/close`, send("POST", input)), "Não foi possível fechar a OS."); },
  async cancel(id: string): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}/cancel`, send("POST")), "Não foi possível cancelar a OS."); },
  async reopen(id: string): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}/reopen`, send("POST")), "Não foi possível reabrir a OS."); },
  async interrupt(id: string): Promise<OsDetail> { return parse(await authFetch(`/service-orders/${id}/interrupt`, send("POST")), "Não foi possível interromper a OS."); },
};
export const opOptions = async (): Promise<OsOptions> => parse(await authFetch("/op/options", { cache: "no-store" }), "Não foi possível carregar as opções.");

const TZ = "America/Manaus";
export const fmtDate = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: TZ }) : "—");
export const fmtTime = (v: string | null | undefined) => (v ? new Date(v).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : "");
export const fmtDateTime = (v: string | null | undefined) => (v ? `${fmtDate(v)} ${fmtTime(v)}` : "—");
/** Valor para <input type="datetime-local"> no fuso de Manaus (UTC-4). */
export const toLocalInput = (v: string | null | undefined) => (v ? new Date(new Date(v).getTime() - 4 * 3600e3).toISOString().slice(0, 16) : "");
export const fromLocalInput = (v: string) => (v ? new Date(`${v}:00-04:00`).toISOString() : undefined);

export type Management = {
  total: number; open: number; late: number; value: number; openValue: number; averageCloseDays: number;
  byStatus: { label: string; value: number }[]; byType: { label: string; value: number }[]; byTechnician: { label: string; value: number }[];
  monthly: { month: string; count: number; value: number }[]; lateList: OsRow[];
};
export const managementClient = async (): Promise<Management> => parse(await authFetch("/service-orders/management", { cache: "no-store" }), "Não foi possível carregar a gestão.");
export const openFromQuote = async (quoteId: string): Promise<OsDetail> => parse(await authFetch(`/service-orders/from-quote/${quoteId}`, send("POST")), "Não foi possível abrir a OS.");

export type WorkRow = {
  id: string; number: number; type: number; status: number; personName: string; personNickname: string | null; defect: string | null; address: OsAddress | null;
  openedAt: string; scheduleStart: string | null; scheduleEnd: string | null; closedAt: string | null; technicians: string[]; sellers: string[]; quoteNumbers: number[];
  totalServices: number; totalProducts: number; total: number; serviceCount: number; productCount: number; qty: number; delivered: number; attachments: number; calls: number; pendencies: number; lateDays: number;
  checklist: { technician: boolean; scheduled: boolean; items: boolean; materials: boolean; photos: boolean; onTime: boolean };
};
export type PendingQuote = { id: string; number: number; personName: string; title: string | null; wonAt: string; total: number };
export type WorksData = { generatedAt: string; works: WorkRow[]; pendingQuotes: PendingQuote[] };
export const worksClient = async (): Promise<WorksData> => parse(await authFetch("/service-orders/works", { cache: "no-store" }), "Não foi possível carregar a gestão de obras.");
