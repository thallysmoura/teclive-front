"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { money } from "@/lib/cadastros";
import { OsComments } from "@/components/operacional/os-comments";
import { ImageLightbox } from "@/components/operacional/image-lightbox";
import { OS_STATUS, addressLine, fmtDate, fmtDateTime, formatMinutes, formatOsNumber, osClient, type OsDetail, type OsFilters } from "@/lib/operacional";
import { formatQuoteNumber } from "@/lib/comercial";

const TABS = ["Resumo", "Serviços", "Produtos", "Atendimentos", "Questionários", "Adiantamentos", "Fechamento/Cobrança", "Anexos", "Histórico"] as const;
type Tab = (typeof TABS)[number];
const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";
const ADVANCE_STATUS: Record<number, string> = { 6: "Pago", 1: "Em aberto" };

const Empty = ({ icon, text }: { icon: string; text: string }) => (
  <div className="flex flex-col items-center gap-2 py-12 text-ds-text-secondary"><Icon name={icon} className="!text-[48px] text-ds-border" /><p className="text-sm">{text}</p></div>
);

function Field({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-ds-border-subtle px-4 py-3 last:border-0">
      <Icon name={icon} className="mt-0.5 text-[20px] text-ds-text-secondary" />
      <div className="min-w-0 flex-1"><p className="text-xs font-bold text-ds-primary-deep">{label}</p><div className="break-words text-sm text-ds-text-muted">{children}</div></div>
    </div>
  );
}

function ItemsTable({ rows, kind, editable, onRemove, onDeliver }: { rows: OsDetail["services"]; kind: "service" | "product"; editable: boolean; onRemove: (id: number) => void; onDeliver?: (id: number) => void }) {
  if (!rows.length) return <Empty icon={kind === "service" ? "build" : "inventory_2"} text={kind === "service" ? "Nenhum serviço nesta OS." : "Nenhum produto nesta OS."} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead><tr className="text-left text-xs uppercase text-ds-text-secondary"><th className="py-2">Descrição</th><th className="py-2 text-right">Quant.</th><th className="py-2 text-right">Unitário</th><th className="py-2 text-right">Desconto</th><th className="py-2 text-right">Total</th><th className="w-24 py-2 text-right">Ações</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const discount = typeof r.valores?.desconto === "number" ? r.valores.desconto : r.valores?.desconto?.valor ?? 0;
            const name = r.servico?.descricao ?? r.produto?.descricao ?? "—";
            const delivered = r.quantidadeEntregue ?? 0;
            return (
              <tr key={r.ordemServicoItemId} className="border-t border-ds-border-subtle">
                <td className="py-2.5 pr-3 font-medium uppercase text-ds-text">{name}{r.orcamento && <span className="ml-2 rounded-full border border-ds-primary-deep px-2 py-0.5 text-[10px] font-semibold normal-case text-ds-primary-deep">Orçamento {formatQuoteNumber(r.orcamento.numero)}</span>}
                  {kind === "product" && <span className={`ml-2 text-xs normal-case ${delivered >= r.quantidade ? "text-ds-success" : "text-ds-warning-text"}`}>{delivered >= r.quantidade ? "Entregue" : `Entregue ${delivered}/${r.quantidade}`}</span>}</td>
                <td className="py-2.5 text-right">{r.quantidade} {r.produto?.unidadeMedida ?? "UN"}</td>
                <td className="py-2.5 text-right">{money(r.valores?.unitario ?? 0)}</td>
                <td className="py-2.5 text-right text-ds-danger-text">{money(discount)}</td>
                <td className="py-2.5 text-right font-semibold">{money(r.valores?.total ?? 0)}</td>
                <td className="py-2.5 text-right">
                  {kind === "product" && editable && delivered < r.quantidade && onDeliver && <button type="button" title="Registrar entrega" aria-label="Registrar entrega" onClick={() => onDeliver(r.ordemServicoItemId)} className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-primary-deep hover:border-ds-primary"><Icon name="local_shipping" className="text-[18px]" /></button>}
                  {editable && !r.orcamento && <button type="button" title="Remover" aria-label="Remover" onClick={() => onRemove(r.ordemServicoItemId)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ds-danger text-white"><Icon name="delete" className="text-[18px]" /></button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AddItem({ kind, onAdd, onClose }: { kind: "service" | "product"; onAdd: (v: { description: string; quantity: number; unitValue: number; discount: number }) => Promise<void>; onClose: () => void }) {
  const [v, setV] = useState({ description: "", quantity: "1", unitValue: "", discount: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.description.trim()) return setError("Informe a descrição.");
    setSaving(true); setError("");
    try { await onAdd({ description: v.description.trim(), quantity: Number(v.quantity.replace(",", ".")), unitValue: Number(v.unitValue.replace(",", ".")), discount: Number(v.discount.replace(",", ".")) || 0 }); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível adicionar."); setSaving(false); }
  }
  return (
    <form onSubmit={submit} noValidate className="mb-4 grid gap-3 rounded-xl border border-ds-border-subtle bg-ds-bg p-4 sm:grid-cols-[1fr_90px_120px_120px_auto]">
      <label className="flex flex-col gap-1.5"><FieldLabel>{kind === "service" ? "Serviço" : "Produto"}</FieldLabel><Input autoFocus value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={200} /></label>
      <label className="flex flex-col gap-1.5"><FieldLabel>Quant.</FieldLabel><Input inputMode="decimal" value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} /></label>
      <label className="flex flex-col gap-1.5"><FieldLabel>Unitário</FieldLabel><Input inputMode="decimal" placeholder="0,00" value={v.unitValue} onChange={(e) => setV({ ...v, unitValue: e.target.value })} /></label>
      <label className="flex flex-col gap-1.5"><FieldLabel>Desconto</FieldLabel><Input inputMode="decimal" placeholder="0,00" value={v.discount} onChange={(e) => setV({ ...v, discount: e.target.value })} /></label>
      <div className="flex items-end gap-2"><Button type="submit" disabled={saving}>{saving ? "..." : "Adicionar"}</Button><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button></div>
      {error && <p role="alert" className="text-xs text-ds-danger-text sm:col-span-5">{error}</p>}
    </form>
  );
}

function CloseDialog({ os, filters, onClose, onDone }: { os: OsDetail; filters: OsFilters | null; onClose: () => void; onDone: (os: OsDetail) => void }) {
  const [cause, setCause] = useState("");
  const [solution, setSolution] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try { onDone(await osClient.close(os.id, { cause, solution })); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível fechar."); setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} labelledBy="close-os-title">
      <form onSubmit={submit} className="flex flex-col gap-4 p-6">
        <h2 id="close-os-title" className="text-lg font-bold text-ds-primary-deep">Fechar OS {formatOsNumber(os.number)}</h2>
        {os.pendingList.length > 0 && <ul role="alert" className="rounded-lg border border-ds-danger-border bg-ds-danger-bg p-3 text-sm text-ds-danger-text">{os.pendingList.map((p) => <li key={p.tipoPendencia}>• {p.mensagem}</li>)}</ul>}
        <label className="flex flex-col gap-1.5"><FieldLabel>Causa</FieldLabel><select className={selectClass} value={cause} onChange={(e) => setCause(e.target.value)}><option value="">Não informado</option>{filters?.causes.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="flex flex-col gap-1.5"><FieldLabel>Solução</FieldLabel><select className={selectClass} value={solution} onChange={(e) => setSolution(e.target.value)}><option value="">Não informado</option>{filters?.solutions.map((c) => <option key={c}>{c}</option>)}</select></label>
        {error && <p role="alert" className="text-sm text-ds-danger-text">{error}</p>}
        <div className="flex gap-3 border-t border-ds-border-subtle pt-4"><Button type="submit" disabled={saving || os.pendingList.length > 0}>{saving ? "Fechando..." : "Fechar OS"}</Button><Button type="button" variant="secondary" onClick={onClose}>Voltar</Button></div>
      </form>
    </Modal>
  );
}

export function OsDetailModal({ id, onClose, onChanged, onEdit }: { id: string; onClose: () => void; onChanged: () => void; onEdit: (os: OsDetail) => void }) {
  const [os, setOs] = useState<OsDetail | null>(null);
  const [filters, setFilters] = useState<OsFilters | null>(null);
  const [tab, setTab] = useState<Tab>("Resumo");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<"service" | "product" | null>(null);
  const [menu, setMenu] = useState(false);
  const [closing, setClosing] = useState(false);
  const [histQ, setHistQ] = useState("");
  const [logs, setLogs] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => { osClient.get(id).then(setOs).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")); osClient.filters().then(setFilters).catch(() => {}); }, [id]);

  async function run(fn: () => Promise<OsDetail>) {
    setError("");
    try { setOs(await fn()); onChanged(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir a operação."); }
  }

  const open = os ? [0, 1, 8].includes(os.status) : false;
  const status = os ? OS_STATUS[os.status] : null;
  const history = (os?.history ?? []).filter((h) => (logs ? true : !h.isLog) && h.descricao.toLowerCase().includes(histQ.toLowerCase()));

  return (
    <Modal open onClose={onClose} flush labelledBy="os-title">
      <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar (Esc)" className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full text-ds-text-secondary transition-colors hover:bg-ds-bg hover:text-ds-primary-deep"><Icon name="close" className="text-[24px]" /></button>
      <div className="flex min-h-0 flex-1 flex-col">
        {!os ? <div className="p-10 pt-16 text-center text-sm text-ds-text-secondary">{error || "Carregando..."}</div> : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-1 pr-14 pt-4 sm:px-6 sm:pr-16">
              <div className="min-w-0">
                <h3 id="os-title" className="text-lg font-bold leading-snug text-ds-primary-deep sm:text-xl">{os.personName}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                  <span className="rounded border border-ds-primary-deep px-2 py-0.5 text-ds-primary-deep">{formatOsNumber(os.number)}</span>
                  {status && <span className={`rounded px-2 py-0.5 ${status.className}`}>{status.label}</span>}
                  <span className="rounded border border-ds-primary-deep px-2 py-0.5 text-ds-primary-deep">{os.typeLabel}</span>
                  {os.quoteNumbers.map((n) => <span key={n} className="rounded-full border border-ds-primary-deep px-2 py-0.5 text-ds-primary-deep">Orçamento {formatQuoteNumber(n)}</span>)}
                </div>
                <p className="mt-1.5 text-xs text-ds-text-secondary">Aberto por <strong>{os.openedBy}</strong> em {fmtDateTime(os.openedAt)}</p>
              </div>
              <div className="relative flex gap-2">
                {open && <button type="button" onClick={() => setClosing(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#F7941D] px-4 text-sm font-bold text-white hover:brightness-95"><Icon name="check" className="text-[18px]" />Fechar OS</button>}
                <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="inline-flex h-10 items-center gap-1 rounded-lg border border-ds-primary-deep px-3 text-sm font-semibold text-ds-primary-deep">Ações<Icon name="arrow_drop_down" className="text-[18px]" /></button>
                {menu && (
                  <ul className="absolute right-0 top-11 z-10 w-52 overflow-hidden rounded-xl border border-ds-border-subtle bg-white py-1 text-sm shadow-xl" onClick={() => setMenu(false)}>
                    {open && <li><button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-ds-bg" onClick={() => onEdit(os)}><Icon name="edit" className="text-[18px]" />Editar dados</button></li>}
                    <li><button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-ds-bg" onClick={() => window.print()}><Icon name="print" className="text-[18px]" />Imprimir</button></li>
                    {open && <li><button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-ds-bg" onClick={() => void run(() => osClient.interrupt(os.id))}><Icon name="pause_circle" className="text-[18px]" />Interromper</button></li>}
                    {[2, 3, 4].includes(os.status) && <li><button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-ds-bg" onClick={() => void run(() => osClient.reopen(os.id))}><Icon name="restart_alt" className="text-[18px]" />Reabrir</button></li>}
                    {[0, 1, 3, 7, 8].includes(os.status) && <li><button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-ds-danger-text hover:bg-ds-danger-bg" onClick={() => { if (confirm(`Cancelar a OS ${formatOsNumber(os.number)}?`)) void run(() => osClient.cancel(os.id)); }}><Icon name="cancel" className="text-[18px]" />Cancelar OS</button></li>}
                  </ul>
                )}
              </div>
            </div>

            <nav aria-label="Seções da OS" className="mt-3 flex shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-ds-border-subtle px-2 text-sm sm:px-5">
              {TABS.map((t) => {
                const count = t === "Serviços" ? os.services.length : t === "Produtos" ? os.products.length : t === "Atendimentos" ? os.calls.length : t === "Anexos" ? os.attachments.length : null;
                return <button key={t} type="button" onClick={() => setTab(t)} aria-current={tab === t} className={`whitespace-nowrap border-b-2 px-3 py-2.5 font-medium ${tab === t ? "border-ds-primary-deep text-ds-primary-deep" : "border-transparent text-ds-text-muted hover:text-ds-primary"}`}>{t}{count ? <span className="ml-1 text-xs text-ds-text-secondary">({count})</span> : null}</button>;
              })}
            </nav>
            {error && <p role="alert" className="mx-4 mt-3 sm:mx-6 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}

            <div className="p-4 sm:p-6">
              {tab === "Resumo" && (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                  <section className="self-start rounded-xl border border-ds-border-subtle">
                    <h4 className="border-b border-ds-border-subtle px-4 py-2.5 text-sm font-bold text-ds-primary-deep">Dados Básicos</h4>
                    <Field icon="location_on" label={os.address?.titulo ?? "Local"}>{addressLine(os.address)}</Field>
                    <Field icon="call" label="Contato Principal">{os.contact?.nome ?? "Sem contato"}{os.contact?.telefone ? ` · ${os.contact.telefone}` : ""}</Field>
                    <Field icon="build" label="Tipo">{os.typeLabel}</Field>
                    <Field icon="groups" label="Equipe Técnica">{os.technicians.join(", ") || "Nenhum técnico atribuído"}</Field>
                    <Field icon="event" label="Agendamento">{os.scheduleStart ? `${fmtDate(os.scheduleStart)} das ${fmtDateTime(os.scheduleStart).slice(-5)} até ${fmtDate(os.scheduleEnd) === fmtDate(os.scheduleStart) ? "" : fmtDate(os.scheduleEnd) + " "}${fmtDateTime(os.scheduleEnd).slice(-5)}` : "Sem agendamento"}</Field>
                    <Field icon="report_problem" label="Motivo / Defeito">{os.defect ?? "Não informado"}</Field>
                    <Field icon="badge" label="Vendedores">{os.sellers.join(", ") || "Não informado"}</Field>
                    <Field icon="description" label="Contrato">Nenhum contrato vinculado</Field>
                  </section>
                  <div className="flex flex-col gap-4">
                    <section className="rounded-xl border border-ds-border-subtle">
                      <h4 className="border-b border-ds-border-subtle px-4 py-2.5 text-sm font-bold text-ds-primary-deep">Valores</h4>
                      <dl className="grid grid-cols-3 gap-2 p-4 text-sm"><div><dt className="text-xs font-bold text-ds-primary-deep">Serviços</dt><dd>{money(os.totalServices)}</dd></div><div><dt className="text-xs font-bold text-ds-primary-deep">Produtos</dt><dd>{money(os.totalProducts)}</dd></div><div><dt className="text-xs font-bold text-ds-primary-deep">Total</dt><dd className="font-bold">{money(os.totalServices + os.totalProducts)}</dd></div></dl>
                    </section>
                    <OsComments os={os} onUpdated={(updated) => { setOs(updated); onChanged(); }} />
                  </div>
                </div>
              )}

              {(tab === "Serviços" || tab === "Produtos") && (() => {
                const kind = tab === "Serviços" ? "service" : "product";
                const rows = kind === "service" ? os.services : os.products;
                return (
                  <section>
                    <div className="mb-3 flex items-center justify-between"><h4 className="text-lg font-bold text-ds-primary-deep">{tab} ({rows.length})</h4>{open && <button type="button" onClick={() => setAdding(kind)} className="rounded-lg border border-[#F7941D] px-4 py-1.5 text-sm font-semibold text-[#F7941D] hover:bg-[#F7941D] hover:text-white">Adicionar</button>}</div>
                    {adding === kind && <AddItem kind={kind} onAdd={async (v) => { setOs(await osClient.addItem(os.id, { kind, ...v })); onChanged(); }} onClose={() => setAdding(null)} />}
                    <ItemsTable rows={rows} kind={kind} editable={open} onRemove={(itemId) => void run(() => osClient.removeItem(os.id, itemId))} onDeliver={(itemId) => void run(() => osClient.deliver(os.id, itemId))} />
                    <div className="mt-4 flex justify-end gap-6 rounded-lg bg-ds-bg px-4 py-3 text-sm"><span>{tab} cobrados</span><strong>{money(kind === "service" ? os.totalServices : os.totalProducts)}</strong></div>
                  </section>
                );
              })()}

              {tab === "Atendimentos" && (os.calls.length ? (
                <ul className="space-y-2">{os.calls.map((c) => <li key={c.atendimentoId} className="rounded-lg border border-ds-border-subtle p-3 text-sm"><p className="text-xs font-bold text-ds-primary-deep">{c.registro?.nomeUsuario ?? "—"} <span className="font-normal text-ds-text-secondary">· {fmtDateTime(c.dataHoraInicio)} → {fmtDateTime(c.dataHoraFim).slice(-5)} · {formatMinutes(c.duracaoEmMinutos ?? 0)}</span></p><p className="mt-1 whitespace-pre-wrap text-ds-text-muted">{c.descricao}</p></li>)}</ul>
              ) : <Empty icon="route" text="Nenhum Atendimento Realizado" />)}

              {tab === "Questionários" && (os.questionnaires.length ? (
                <ul className="space-y-2">{os.questionnaires.map((q, i) => <li key={i} className="flex items-center justify-between rounded-lg border border-ds-border-subtle p-3 text-sm"><span className="font-semibold text-ds-primary-deep">{q.titulo}</span><span className="text-ds-text-muted">{q.quantidadePerguntasRespondidas}/{q.quantidadePerguntas} respondidas</span></li>)}</ul>
              ) : <Empty icon="checklist" text="Nenhum Questionário Associado" />)}

              {tab === "Adiantamentos" && (os.advances.length ? (
                <table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase text-ds-text-secondary"><th className="py-2">Conta</th><th>Parcela</th><th>Vencimento</th><th>Forma</th><th>Situação</th><th className="text-right">Valor</th></tr></thead>
                  <tbody>{os.advances.map((a) => <tr key={a.numeroConta + a.parcela} className="border-t border-ds-border-subtle"><td className="py-2">{a.numeroConta}</td><td>{a.parcela}</td><td>{fmtDate(a.dataVencimento)}</td><td>{a.formaPagamento?.descricao ?? "—"}</td><td>{ADVANCE_STATUS[a.status] ?? "Em aberto"}</td><td className="text-right font-semibold">{money(a.valor)}</td></tr>)}</tbody></table>
              ) : <Empty icon="payments" text="Nenhum adiantamento nesta OS." />)}

              {tab === "Fechamento/Cobrança" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <section className="rounded-xl border border-ds-border-subtle p-4 text-sm"><h4 className="mb-3 font-bold text-ds-primary-deep">Dados de Fechamento</h4><p className="text-xs font-bold text-ds-primary-deep">Causa</p><p className="mb-3 text-ds-text-muted">{os.cause ?? "Não informado"}</p><p className="text-xs font-bold text-ds-primary-deep">Solução</p><p className="text-ds-text-muted">{os.solution ?? "Não informado"}</p>{os.closedAt && <p className="mt-3 text-xs text-ds-text-secondary">Fechada em {fmtDateTime(os.closedAt)}</p>}</section>
                  <section className="rounded-xl border border-ds-border-subtle p-4 text-sm"><h4 className="mb-3 font-bold text-ds-primary-deep">Dados de Cobrança</h4><p className="text-xs font-bold text-ds-primary-deep">Forma de Pagamento</p><p className="mb-3 text-ds-text-muted">{os.paymentMethod ?? "À vista"}{os.installments && os.installments > 1 ? ` · ${os.installments}x` : ""}</p>
                    <dl className="grid grid-cols-3 gap-2 rounded-lg border border-ds-border-subtle p-3"><div><dt className="text-xs font-bold text-ds-primary-deep">Serviços</dt><dd>{money(os.totalServices)}</dd></div><div><dt className="text-xs font-bold text-ds-primary-deep">Produtos</dt><dd>{money(os.totalProducts)}</dd></div><div><dt className="text-xs font-bold text-ds-primary-deep">Total</dt><dd className="font-bold">{money(os.totalServices + os.totalProducts)}</dd></div></dl></section>
                </div>
              )}

              {tab === "Anexos" && (os.attachments.length ? (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{os.attachments.map((a) => (
                  <li key={a.ordemServicoArquivoId} className="overflow-hidden rounded-xl border border-ds-border-subtle text-xs">
                    <button type="button" onClick={() => setZoom(os.attachments.indexOf(a))} aria-label={`Ampliar ${a.nomeArquivo}`} className="block aspect-video w-full cursor-zoom-in bg-ds-bg"><img src={a.url} alt={a.legenda ?? a.nomeArquivo} loading="lazy" className="h-full w-full object-cover" /></button>
                    <div className="p-2"><p className="truncate font-semibold text-ds-primary-deep">{a.nomeArquivo}.{a.extensaoArquivo}</p><p className="text-ds-text-secondary">{a.nomeUsuario} · {fmtDateTime(a.dataAnexo)}</p></div>
                  </li>))}</ul>
              ) : <Empty icon="attach_file" text="Nenhum anexo nesta OS." />)}

              {tab === "Histórico" && (
                <section>
                  <div className="mb-3 flex items-center gap-2"><h4 className="text-lg font-bold text-ds-primary-deep">Histórico</h4><button type="button" onClick={() => setLogs((v) => !v)} aria-pressed={logs} className={`ml-auto rounded border px-2.5 py-1 text-xs font-semibold ${logs ? "border-ds-primary-deep bg-ds-primary-deep text-white" : "border-ds-primary-deep text-ds-primary-deep"}`}>Logs</button><Input value={histQ} onChange={(e) => setHistQ(e.target.value)} placeholder="Pesquisar..." className="max-w-56" aria-label="Pesquisar no histórico" /></div>
                  {history.length ? <ul className="divide-y divide-ds-border-subtle rounded-xl border border-ds-border-subtle">{history.map((h, i) => <li key={i} className="px-4 py-2.5 text-sm"><p className="text-ds-text">{h.descricao}</p><p className="text-xs text-ds-text-secondary">{fmtDateTime(h.dataHora)} · {h.nomeUsuario}</p></li>)}</ul> : <Empty icon="history" text="Nenhum registro encontrado." />}
                </section>
              )}
            </div>
          </div>
        )}
      </div>
      {zoom !== null && os && <ImageLightbox items={os.attachments.map((a) => ({ name: `${a.nomeArquivo}.${a.extensaoArquivo}`, src: a.url }))} index={zoom} onIndex={setZoom} onClose={() => setZoom(null)} />}
      {closing && os && <CloseDialog os={os} filters={filters} onClose={() => setClosing(false)} onDone={(updated) => { setOs(updated); setClosing(false); onChanged(); }} />}
    </Modal>
  );
}
