"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDocument, money } from "@/lib/cadastros";
import { COMERCIAL_KEYS, QUOTE_STATUS, formatQuoteNumber, modalityLabel, quotesClient, type QuoteDetail, type QuoteInput, type QuoteItem } from "@/lib/comercial";
import { formatPhone } from "@/lib/company";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { AttachmentModal, BasicModal, DecisionModal, ItemModal, PaymentModal, TextModal } from "@/components/comercial/quote-modals";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

type Tab = "info" | "products" | "services" | "recurring" | "payments" | "attachments" | "history";
type ModalName = "basic" | "sheet" | "notes" | "address" | "contact" | "decision" | "payment" | "item" | "attachment" | "cancel" | null;

const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");
const fmtDateTime = (v: string) => new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const EDITABLE = [3, 6];
const linkButton = "text-xs font-semibold text-ds-primary hover:underline disabled:opacity-40";
const outlineButton = "rounded-md border border-ds-primary px-3 py-1.5 text-xs font-bold text-ds-primary hover:bg-ds-primary hover:text-white";
const KIND_TITLE = { PRODUCT: "Produtos", SERVICE: "Serviços", RECURRING: "Serviços Recorrentes" } as const;

function Card({ title, icon, action, children, className = "" }: { title: string; icon: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-ds-border-subtle bg-white ${className}`}>
      <header className="flex items-center justify-between border-b border-ds-border-subtle px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ds-text-muted"><Icon name={icon} className="text-[18px]" />{title}</h3>
        {action}
      </header>
      <div className="p-4 text-sm text-ds-text">{children}</div>
    </section>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return <div className="flex flex-col items-center gap-3 py-12 text-ds-text-secondary"><Icon name={icon} className="!text-[72px] text-ds-text-secondary/60" /><p className="text-sm">{text}</p></div>;
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-ds-border-subtle bg-white p-4">
      <p className="text-xs text-ds-text-secondary">{label}</p>
      <p className="flex items-center gap-1.5 text-lg font-bold text-ds-primary-deep">{value}<span title={hint} aria-label={hint} className="inline-flex"><Icon name="info" className="text-[14px] text-ds-text-secondary" /></span></p>
    </div>
  );
}

/** Modal genérico de campos de texto (endereço e contato). */
function FieldsModal({ title, fields, initial, open, onClose, onSave }: { title: string; fields: [string, string][]; initial: Record<string, string>; open: boolean; onClose: () => void; onSave: (v: Record<string, string>) => Promise<void> }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setValues(initial); setError(""); } }, [open, initial]);
  return (
    <Modal open={open} onClose={onClose} labelledBy="fields-title">
      <form noValidate onSubmit={async (e) => { e.preventDefault(); setSaving(true); setError(""); try { await onSave(values); onClose(); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); } finally { setSaving(false); } }}>
        <h2 id="fields-title" className="mb-4 text-lg font-bold text-ds-primary-deep">{title}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1.5"><FieldLabel>{label}</FieldLabel>
              <Input value={values[key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [key]: key === "telefone" ? formatPhone(e.target.value) : e.target.value }))} />
            </label>
          ))}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
        <div className="mt-5 flex justify-end gap-3 border-t border-ds-border-subtle pt-4"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></div>
      </form>
    </Modal>
  );
}

function ItemsTable({ items, kind, onEdit, onRemove }: { items: QuoteItem[]; kind: QuoteItem["kind"]; onEdit: (item: QuoteItem) => void; onRemove: (item: QuoteItem) => void }) {
  const rows = items.filter((i) => i.kind === kind);
  const recurring = kind === "RECURRING";
  if (rows.length === 0) return <Empty icon={kind === "PRODUCT" ? "inventory_2" : "design_services"} text={`Nenhum ${kind === "PRODUCT" ? "Produto" : kind === "SERVICE" ? "Serviço" : "Serviço Recorrente"} Adicionado`} />;
  return (
    <div className="ds-table-wrap">
      <table className="ds-table">
        <thead><tr><th>Descrição</th>{!recurring && <><th className="md:text-right">Quant.</th><th className="md:text-right">Unitário</th><th className="md:text-right">Desconto</th></>}<th className="md:text-right">{recurring ? "Valor mensal" : "Total"}</th><th className="text-center">Ações</th></tr></thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id}>
              <td data-label="Descrição">{i.description}{i.identifier && <span className="ml-2 text-xs text-ds-text-secondary">{i.identifier}</span>}{i.rental && <span className="ml-2 rounded-full bg-ds-info/15 px-2 py-0.5 text-[10px] font-bold text-ds-info">Locado</span>}</td>
              {!recurring && <>
                <td data-label="Quant." className="whitespace-nowrap md:text-right">{Number(i.quantity).toLocaleString("pt-BR")} {i.unit ?? ""}</td>
                <td data-label="Unitário" className="whitespace-nowrap md:text-right">{money(i.unitValue)}</td>
                <td data-label="Desconto" className="whitespace-nowrap md:text-right">{money(i.discountValue)}</td>
              </>}
              <td data-label={recurring ? "Valor mensal" : "Total"} className="whitespace-nowrap font-semibold md:text-right">{money(i.total)}</td>
              <td data-label="Ações">
                <span className="flex items-center justify-end gap-1.5 md:justify-center">
                  <button type="button" aria-label="Editar item" onClick={() => onEdit(i)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-ds-primary-deep text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="edit_square" className="text-[16px]" /></button>
                  <button type="button" aria-label="Remover item" onClick={() => onRemove(i)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-ds-danger-border bg-ds-danger-bg text-ds-danger-text hover:bg-ds-danger hover:text-white"><Icon name="delete" className="text-[16px]" /></button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Serviços Cobrados": total − descontos = valor total. */
function TotalsBox({ title, gross, discount, net }: { title: string; gross: number; discount: number; net: number }) {
  const col = "flex flex-col items-end leading-tight";
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-ds-border-subtle px-4 py-3">
      <span className="text-sm text-ds-text-muted">{title}</span>
      <span className="flex items-center gap-4 text-xs">
        <span className={col}><span className="text-ds-text-secondary">Total dos {title === "Produtos" ? "produtos" : "serviços"}</span><strong className="text-sm font-medium text-ds-success">{money(gross)}</strong></span>
        <span className="text-lg text-ds-text-secondary" aria-hidden="true">−</span>
        <span className={col}><span className="text-ds-text-secondary">Descontos</span><strong className="text-sm font-medium text-ds-danger-text">{money(discount)}</strong></span>
        <span className="text-lg text-ds-text-secondary" aria-hidden="true">=</span>
        <span className={col}><span className="text-ds-text-secondary">Valor Total</span><strong className="text-sm font-bold text-ds-primary-deep">{money(net)}</strong></span>
      </span>
    </div>
  );
}

function Details({ id }: { id: string }) {
  const router = useRouter();
  const print = useSearchParams().get("imprimir") === "1";
  const [quote, setQuote] = useState<QuoteDetail | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("info");
  const [toast, setToast] = useState("");
  const [warnings, setWarnings] = useState(false);
  const [menu, setMenu] = useState<"actions" | "os" | "notes" | null>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const [itemKind, setItemKind] = useState<QuoteItem["kind"]>("SERVICE");
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [attachmentSearch, setAttachmentSearch] = useState("");

  const load = useCallback(() => quotesClient.get(id).then(setQuote).catch(() => setQuote(null)), [id]);
  useEffect(() => { quotesClient.get(id).then(setQuote).catch(() => setQuote(null)); }, [id]);
  useEffect(() => { if (print && quote) { const t = setTimeout(() => window.print(), 400); return () => clearTimeout(t); } }, [print, quote]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 5000); return () => clearTimeout(t); }, [toast]);

  if (quote === undefined) return <p className="py-10 text-center text-sm text-ds-text-secondary">Carregando...</p>;
  if (quote === null) return <p className="text-sm text-ds-text-secondary">Orçamento não encontrado. <Link href="/comercial/orcamentos" className="text-ds-primary">Voltar à listagem</Link></p>;

  const status = QUOTE_STATUS[quote.status];
  const editable = EDITABLE.includes(quote.status);
  const update = async (input: QuoteInput) => { setQuote(await quotesClient.update(quote.id, input)); };
  const addr = quote.address;
  // Como no eugestor, os botões ficam visíveis e o bloqueio aparece como aviso.
  const guard = (fn: () => void) => { if (!editable) return setToast(`Não é possível editar um orçamento com ${status?.label ?? "esta situação"}.`); fn(); };
  async function act(fn: () => Promise<QuoteDetail | unknown>) {
    setBusy(true);
    try { const result = await fn(); if (result && typeof result === "object" && "items" in result) setQuote(result as QuoteDetail); else await load(); } catch (e) { setToast(e instanceof Error ? e.message : "Não foi possível concluir a operação."); } finally { setBusy(false); }
  }
  const count = (kind: QuoteItem["kind"]) => quote.items.filter((i) => i.kind === kind).length;
  const gross = (kind: QuoteItem["kind"]) => quote.items.filter((i) => i.kind === kind).reduce((s, i) => s + Number(i.unitValue) * Number(i.quantity), 0);
  const discount = (kind: QuoteItem["kind"]) => quote.items.filter((i) => i.kind === kind).reduce((s, i) => s + Number(i.discountValue), 0);
  const tabs: [Tab, string, number?][] = [
    ["info", "Informações"], ["products", "Produtos", count("PRODUCT")], ["services", "Serviços", count("SERVICE")], ["recurring", "Serviços Recorrentes"],
    ["payments", "Formas de Pagamento", quote.payments.length], ["attachments", "Anexos"], ["history", "Histórico"],
  ];
  const kindOf: Partial<Record<Tab, QuoteItem["kind"]>> = { products: "PRODUCT", services: "SERVICE", recurring: "RECURRING" };
  const attachments = quote.attachments.filter((a) => !attachmentSearch || `${a.fileName} ${a.caption ?? ""}`.toLowerCase().includes(attachmentSearch.toLowerCase()));
  const menuItem = "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-ds-bg";

  return (
    <div onClick={() => menu && setMenu(null)}>
      {toast && (
        <div role="alert" className="fixed left-1/2 top-4 z-[60] flex w-[min(92vw,26rem)] -translate-x-1/2 items-start gap-3 rounded-lg border border-ds-danger-border bg-ds-danger-bg px-4 py-3 text-sm text-ds-danger-text shadow-xl">
          <Icon name="warning" className="mt-0.5 text-[18px]" /><span className="flex-1">{toast}</span><button type="button" aria-label="Fechar aviso" onClick={() => setToast("")}><Icon name="close" className="text-[16px]" /></button>
        </div>
      )}
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Orçamentos", href: "/comercial/orcamentos" }, { label: "Detalhes do Orçamento" }]} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-bold text-ds-primary-deep">Detalhes do Orçamento</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => router.push("/comercial/orcamentos")} className="inline-flex items-center gap-2 rounded-lg border border-ds-primary-deep px-3 py-1.5 text-sm font-semibold text-ds-primary-deep hover:bg-ds-bg"><Icon name="arrow_back" className="text-[16px]" />Voltar</button>
          {editable && <button type="button" onClick={() => setModal("decision")} className="rounded-lg border border-ds-primary-deep bg-ds-primary-deep px-3 py-1.5 text-sm font-semibold text-white hover:bg-ds-primary-hover">Ganhar / Recusar</button>}
          {quote.status === 4 && <button type="button" disabled={busy} onClick={() => void act(() => quotesClient.openWorkOrder(quote.id))} className="rounded-lg border border-ds-primary-deep bg-ds-primary-deep px-3 py-1.5 text-sm font-semibold text-white hover:bg-ds-primary-hover">Abrir Ordem de Serviço</button>}
          {[7, 8].includes(quote.status) && (
            <div className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={menu === "os"} onClick={(e) => { e.stopPropagation(); setMenu(menu === "os" ? null : "os"); }} className="inline-flex items-center gap-1 rounded-lg border border-ds-primary-deep px-3 py-1.5 text-sm font-semibold text-ds-primary-deep hover:bg-ds-bg">Ordens de Serviço<Icon name="arrow_drop_down" className="text-[18px]" /></button>
              {menu === "os" && <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-10 z-30 w-64 rounded-lg border border-ds-border-subtle bg-white p-3 text-sm text-ds-text-secondary shadow-xl">Nenhuma ordem de serviço vinculada. O módulo de Ordens de Serviço ainda não foi implementado.</div>}
            </div>
          )}
          <div className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={menu === "actions"} onClick={(e) => { e.stopPropagation(); setMenu(menu === "actions" ? null : "actions"); }} className="inline-flex items-center gap-1 rounded-lg border border-ds-primary-deep px-3 py-1.5 text-sm font-semibold text-ds-primary-deep hover:bg-ds-bg">Ações<Icon name="arrow_drop_down" className="text-[18px]" /></button>
            {menu === "actions" && (
              <ul role="menu" className="absolute right-0 top-10 z-30 w-52 overflow-hidden rounded-lg border border-ds-border-subtle bg-white py-1 text-sm shadow-xl">
                <li><button type="button" role="menuitem" onClick={() => window.print()} className={`${menuItem} text-ds-primary-deep`}><Icon name="print" className="text-[16px]" />Imprimir</button></li>
                <li><button type="button" role="menuitem" onClick={() => void act(async () => { const copy = await quotesClient.duplicate(quote.id); router.push(`/comercial/orcamentos/${copy.id}`); return null; })} className={`${menuItem} text-ds-primary-deep`}><Icon name="content_copy" className="text-[16px]" />Duplicar</button></li>
                {editable && <li><button type="button" role="menuitem" onClick={() => void act(() => quotesClient.setModality(quote.id, quote.modality === 1 ? 2 : 1))} className={`${menuItem} text-ds-primary-deep`}><Icon name="swap_horiz" className="text-[16px]" />Trocar para {quote.modality === 1 ? "Venda" : "Locação"}</button></li>}
                {![1, 7, 8].includes(quote.status) && <li><button type="button" role="menuitem" onClick={() => setModal("cancel")} className={`${menuItem} text-ds-danger-text`}><Icon name="cancel" className="text-[16px]" />Cancelar Orçamento</button></li>}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="self-start rounded-xl border border-ds-border-subtle bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-ds-text-muted">{formatQuoteNumber(quote.number)}</span>
            <span className="flex gap-1"><span className={`rounded-full px-2 py-0.5 font-bold ${status?.className}`}>{status?.label}</span><span className="rounded-full bg-ds-primary-deep px-2 py-0.5 font-bold text-white">{modalityLabel(quote.modality)}</span></span>
          </div>
          <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full border border-ds-border-subtle bg-ds-bg text-ds-text-muted"><Icon name="request_quote" className="!text-[44px]" /></div>
          <h2 className="mb-4 text-center text-base font-bold text-ds-text-muted">{quote.title || quote.personName}</h2>
          <div className="mb-2 flex items-center justify-between border-b border-ds-border-subtle pb-1"><h3 className="text-sm font-semibold text-ds-text-muted">Dados Básicos</h3><button type="button" onClick={() => guard(() => setModal("basic"))} className="text-xs text-ds-text-muted hover:text-ds-primary">Editar</button></div>
          <dl className="space-y-2.5 text-sm">
            <div><dt className="text-xs font-semibold text-ds-text">Cliente</dt><dd className="text-ds-text-muted">{quote.personName}{quote.personIsLead && <span className="ml-2 rounded-full bg-ds-primary-deep px-2 py-0.5 text-[10px] font-bold text-white">Lead</span>}</dd>{quote.personDocument && <dd className="text-xs text-ds-text-secondary">{formatDocument(quote.personDocument)}</dd>}</div>
            <div><dt className="text-xs font-semibold text-ds-text">Vendedor</dt><dd className="text-ds-text-muted">{quote.sellerName ?? "Não informado"}</dd></div>
            <div><dt className="text-xs font-semibold text-ds-text">Validade</dt><dd className="text-ds-text-muted">{fmtDate(quote.validUntil)}</dd></div>
            <div><dt className="text-xs font-semibold text-ds-text">Data de Abertura</dt><dd className="text-ds-text-muted">{fmtDate(quote.openedAt)}</dd></div>
            {quote.wonAt && <div><dt className="text-xs font-semibold text-ds-text">Data de Ganho</dt><dd className="text-ds-text-muted">{fmtDate(quote.wonAt)}</dd></div>}
            {quote.releasedAt && <div><dt className="text-xs font-semibold text-ds-text">Data de Liberação</dt><dd className="text-ds-text-muted">{fmtDate(quote.releasedAt)}</dd></div>}
            {quote.cancelledAt && <div><dt className="text-xs font-semibold text-ds-text">Data de Cancelamento</dt><dd className="text-ds-danger-text">{fmtDate(quote.cancelledAt)}</dd></div>}
            {quote.refusalReason && <div><dt className="text-xs font-semibold text-ds-text">Motivo da recusa</dt><dd className="text-ds-danger-text">{quote.refusalReason}</dd></div>}
          </dl>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_200px]">
            <button type="button" onClick={() => setWarnings((w) => !w)} aria-expanded={warnings} className="flex items-center gap-3 rounded-xl border border-ds-border-subtle bg-white p-4 text-left">
              <Icon name="campaign" className="!text-[32px] text-ds-text-muted" />
              <span className="min-w-0 flex-1"><span className="block text-base font-semibold text-ds-text-muted">Painel de Avisos <span className="text-xs font-normal text-ds-text-secondary">(0 avisos)</span></span><span className="block text-xs text-ds-text-secondary">{warnings ? "Nenhum aviso para o cliente deste orçamento." : "Painel com avisos referente ao cliente do orçamento"}</span></span>
              <Icon name={warnings ? "expand_less" : "expand_more"} className="text-ds-text-secondary" />
            </button>
            <Kpi label="Serviços Recorrentes" value={money(quote.totals.recurring)} hint="Soma mensal dos serviços recorrentes do orçamento" />
            <Kpi label="Total Líquido" value={money(quote.totals.total)} hint={`Bruto ${money(quote.totals.gross)} − descontos ${money(quote.totals.discount)}`} />
          </div>

          <div className="rounded-xl border border-ds-border-subtle bg-white">
            <div role="tablist" className="flex flex-wrap gap-1 border-b border-ds-border-subtle px-3 pt-2">
              {tabs.map(([key, label, n]) => (
                <button key={key} role="tab" aria-selected={tab === key} type="button" onClick={() => setTab(key)} className={`rounded-t-lg border-x border-t px-3 py-2 text-sm font-medium ${tab === key ? "border-ds-border-subtle bg-white text-ds-text" : "border-transparent text-ds-primary hover:text-ds-primary-deep"}`}>
                  {label}{n !== undefined && <span className="ml-1 text-xs text-ds-text-secondary">({n})</span>}
                </button>
              ))}
            </div>

            <div className="p-4">
              {tab === "info" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-ds-border-subtle px-4 py-2.5 text-sm"><span className="flex items-center gap-2 text-ds-text-muted"><Icon name="draw" className="text-[18px]" />Assinatura Eletrônica</span><a href="https://www.gov.br/iti/pt-br/assuntos/assinatura-eletronica" target="_blank" rel="noopener noreferrer" className={linkButton}>Saiba Mais</a></div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card title="Endereço" icon="location_on" action={<button type="button" onClick={() => guard(() => setModal("address"))} className={linkButton}>Alterar</button>}>
                      {addr?.logradouro ? (<><p className="font-semibold">{addr.titulo} <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${addr.logradouro}, ${addr.numero} - ${addr.cidade}`)}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs font-normal text-ds-primary hover:underline">Ver no mapa ›</a></p><p className="text-ds-text-muted">{addr.logradouro}, {addr.numero} - {addr.bairro}, {addr.cidade} - {addr.uf}, {addr.cep}</p></>) : <p className="text-ds-text-secondary">Nenhum endereço informado.</p>}
                    </Card>
                    <Card title="Contato" icon="call" action={<button type="button" onClick={() => guard(() => setModal("contact"))} className={linkButton}>Alterar</button>}>
                      <p className="font-semibold">{quote.contactName ?? "Contato Principal"}</p>
                      <p className="text-ds-text-secondary">{quote.contactPhone || quote.contactEmail ? [quote.contactPhone, quote.contactEmail].filter(Boolean).join(" · ") : "Sem telefone e email informado."}</p>
                    </Card>
                    <Card title="Ficha Técnica" icon="checklist" className="lg:row-span-2" action={<button type="button" onClick={() => guard(() => setModal("sheet"))} className={linkButton}>Alterar</button>}>
                      {quote.technicalSheet ? <p className="whitespace-pre-wrap">{quote.technicalSheet}</p> : <p className="text-ds-text-secondary">Não informada.</p>}
                    </Card>
                    <Card title="Observação" icon="notes" action={
                      <span className="relative flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${quote.showNotes ? "bg-ds-success/15 text-ds-success" : "bg-ds-danger-bg text-ds-danger-text"}`}><Icon name={quote.showNotes ? "visibility" : "visibility_off"} className="text-[12px]" />{quote.showNotes ? "Exibindo" : "Ocultando"}</span>
                        <button type="button" aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); setMenu(menu === "notes" ? null : "notes"); }} className={`${linkButton} inline-flex items-center`}>Opções<Icon name="arrow_drop_down" className="text-[16px]" /></button>
                        {menu === "notes" && (
                          <ul role="menu" className="absolute right-0 top-6 z-20 w-44 overflow-hidden rounded-lg border border-ds-border-subtle bg-white py-1 text-sm shadow-xl">
                            <li><button type="button" role="menuitem" onClick={() => { setMenu(null); guard(() => setModal("notes")); }} className={`${menuItem} text-ds-primary-deep`}><Icon name="edit" className="text-[16px]" />Alterar</button></li>
                            <li><button type="button" role="menuitem" onClick={() => { setMenu(null); guard(() => void update({ showNotes: !quote.showNotes })); }} className={`${menuItem} text-ds-primary-deep`}><Icon name={quote.showNotes ? "visibility_off" : "visibility"} className="text-[16px]" />{quote.showNotes ? "Ocultar no orçamento" : "Exibir no orçamento"}</button></li>
                          </ul>
                        )}
                      </span>}>
                      {quote.notes ? <p className="whitespace-pre-wrap">{quote.notes}</p> : <p className="text-ds-text-secondary">Não informado</p>}
                    </Card>
                  </div>
                </div>
              )}

              {kindOf[tab] && (() => {
                const kind = kindOf[tab]!;
                return (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-ds-text-muted">{KIND_TITLE[kind]} <span className="text-sm font-normal text-ds-text-secondary">({count(kind)})</span></h3>
                      <button type="button" onClick={() => guard(() => { setEditingItem(null); setItemKind(kind); setModal("item"); })} className={outlineButton}>Adicionar</button>
                    </div>
                    <ItemsTable items={quote.items} kind={kind} onEdit={(item) => guard(() => { setEditingItem(item); setItemKind(item.kind); setModal("item"); })} onRemove={(item) => guard(() => void act(() => quotesClient.removeItem(quote.id, item.id)))} />
                    {kind !== "RECURRING" && count(kind) > 0 && <TotalsBox title={kind === "PRODUCT" ? "Produtos" : "Serviços Cobrados"} gross={gross(kind)} discount={discount(kind)} net={kind === "PRODUCT" ? quote.totals.products : quote.totals.services} />}
                  </div>
                );
              })()}

              {tab === "payments" && (
                <div>
                  <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold text-ds-text-muted">Propostas de Pagamento <span className="text-sm font-normal text-ds-text-secondary">({quote.payments.length})</span></h3><button type="button" onClick={() => guard(() => setModal("payment"))} className={outlineButton}>Adicionar</button></div>
                  {quote.payments.length === 0 ? <Empty icon="payments" text="Nenhuma Proposta de Pagamento" /> : (
                    <div className="ds-table-wrap"><table className="ds-table">
                      <thead><tr><th>Condição</th><th>Forma de Pagto.</th><th className="md:text-right">Total</th><th className="text-center">Ações</th></tr></thead>
                      <tbody>
                        {quote.payments.map((p) => (
                          <tr key={p.id}>
                            <td data-label="Condição">{p.installments}x de {money(Number(p.total) / p.installments)}</td>
                            <td data-label="Forma de Pagto.">{p.method}{p.selected && <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-ds-success px-2 py-0.5 text-[10px] font-bold text-ds-success"><Icon name="check" className="text-[12px]" />Proposta Aceita</span>}</td>
                            <td data-label="Total" className="whitespace-nowrap font-semibold md:text-right">{money(p.total)}</td>
                            <td data-label="Ações" className="md:text-center"><button type="button" aria-label="Remover proposta" onClick={() => guard(() => void act(() => quotesClient.removePayment(quote.id, p.id)))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-ds-danger-border bg-ds-danger-bg text-ds-danger-text hover:bg-ds-danger hover:text-white"><Icon name="delete" className="text-[16px]" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  )}
                </div>
              )}

              {tab === "attachments" && (
                <div>
                  <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold text-ds-text-muted">Anexos <span className="text-sm font-normal text-ds-text-secondary">({quote.attachments.length})</span></h3><button type="button" onClick={() => setModal("attachment")} className={outlineButton}>Adicionar</button></div>
                  <div className="mb-3 max-w-md"><div className="relative"><Input type="search" value={attachmentSearch} onChange={(e) => setAttachmentSearch(e.target.value)} placeholder="Pesquisar..." className="pr-12" /><span className="pointer-events-none absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-[10px] bg-ds-primary-deep text-white"><Icon name="search" className="text-[18px]" /></span></div></div>
                  {attachments.length === 0 ? <Empty icon="photo_library" text="Nenhum Anexo Encontrado" /> : (
                    <div className="ds-table-wrap"><table className="ds-table">
                      <thead><tr><th>Arquivo</th><th>Usuário</th><th>Data</th><th className="md:text-right">Tamanho</th><th className="text-center">Ações</th></tr></thead>
                      <tbody>
                        {attachments.map((a) => (
                          <tr key={a.id}>
                            <td data-label="Arquivo" className="ds-strong">{a.fileName}{a.caption && <span className="block text-xs font-normal text-ds-text-secondary">{a.caption}</span>}</td>
                            <td data-label="Usuário">{a.userName}</td>
                            <td data-label="Data" className="whitespace-nowrap">{fmtDateTime(a.createdAt)}</td>
                            <td data-label="Tamanho" className="whitespace-nowrap md:text-right">{Math.max(1, Math.round(a.size / 1024))} KB</td>
                            <td data-label="Ações"><span className="flex items-center justify-end gap-1.5 md:justify-center">
                              <button type="button" aria-label="Baixar anexo" onClick={() => void quotesClient.downloadAttachment(quote.id, a).catch((e) => setToast(e instanceof Error ? e.message : "Não foi possível baixar o anexo."))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-ds-primary-deep text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="download" className="text-[16px]" /></button>
                              <button type="button" aria-label="Remover anexo" onClick={() => void act(() => quotesClient.removeAttachment(quote.id, a.id))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-ds-danger-border bg-ds-danger-bg text-ds-danger-text hover:bg-ds-danger hover:text-white"><Icon name="delete" className="text-[16px]" /></button>
                            </span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  )}
                </div>
              )}

              {tab === "history" && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-ds-text-muted">Histórico</h3>
                  <ul className="divide-y divide-ds-border-subtle rounded-lg border border-ds-border-subtle">
                    {quote.history.map((h) => (<li key={h.id} className="px-4 py-2.5"><p className="text-sm text-ds-text">{h.description}</p><p className="text-xs text-ds-text-secondary">{fmtDateTime(h.at)} · {h.userName}</p></li>))}
                    {quote.history.length === 0 && <li className="px-4 py-6 text-center text-sm text-ds-text-secondary">Nenhum registro.</li>}
                  </ul>
                  <p className="mt-2 text-xs text-ds-text-secondary">1 a {quote.history.length} de {quote.history.length} registros</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <BasicModal quote={quote} open={modal === "basic"} onClose={() => setModal(null)} onSave={update} />
      <TextModal title="Ficha Técnica" initial={quote.technicalSheet ?? ""} open={modal === "sheet"} onClose={() => setModal(null)} onSave={(v) => update({ technicalSheet: v })} />
      <TextModal title="Observação" initial={quote.notes ?? ""} open={modal === "notes"} onClose={() => setModal(null)} onSave={(v) => update({ notes: v })} />
      <FieldsModal title="Contato" open={modal === "contact"} onClose={() => setModal(null)} fields={[["nome", "Nome"], ["telefone", "Telefone"], ["email", "E-mail"]]}
        initial={{ nome: quote.contactName ?? "", telefone: quote.contactPhone ?? "", email: quote.contactEmail ?? "" }} onSave={(v) => update({ contactName: v.nome, contactPhone: v.telefone, contactEmail: v.email })} />
      <FieldsModal title="Endereço" open={modal === "address"} onClose={() => setModal(null)} fields={[["titulo", "Título"], ["cep", "CEP"], ["logradouro", "Logradouro"], ["numero", "Número"], ["bairro", "Bairro"], ["complemento", "Complemento"], ["cidade", "Cidade"], ["uf", "UF"]]}
        initial={{ titulo: addr?.titulo ?? "", cep: addr?.cep ?? "", logradouro: addr?.logradouro ?? "", numero: addr?.numero ?? "", bairro: addr?.bairro ?? "", complemento: addr?.complemento ?? "", cidade: addr?.cidade ?? "", uf: addr?.uf ?? "" }}
        onSave={(v) => update({ address: v })} />
      <ItemModal kind={itemKind} editing={editingItem} open={modal === "item"} onClose={() => setModal(null)}
        onSave={async (item) => { setQuote(editingItem ? await quotesClient.updateItem(quote.id, editingItem.id, item) : await quotesClient.addItem(quote.id, item)); }} />
      <PaymentModal open={modal === "payment"} onClose={() => setModal(null)} onSave={async (v) => { setQuote(await quotesClient.addPayment(quote.id, v)); }} />
      <AttachmentModal open={modal === "attachment"} onClose={() => setModal(null)} onSave={async (file, caption) => { setQuote(await quotesClient.addAttachment(quote.id, file, caption)); }} />
      <DecisionModal quote={quote} open={modal === "decision"} onClose={() => setModal(null)} onWin={async (paymentId) => { setQuote(await quotesClient.win(quote.id, paymentId)); }} onRefuse={async (reason) => { setQuote(await quotesClient.refuse(quote.id, reason)); }} />
      <Modal open={modal === "cancel"} onClose={() => setModal(null)} labelledBy="cancel-detail-title">
        <h2 id="cancel-detail-title" className="mb-2 text-lg font-bold text-ds-primary-deep">Cancelar o orçamento {formatQuoteNumber(quote.number)}?</h2>
        <p className="mb-6 text-sm text-ds-text-muted">O orçamento ficará como cancelado e não poderá mais ser alterado.</p>
        <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setModal(null)}>Voltar</Button><Button type="button" variant="danger" disabled={busy} onClick={() => { setModal(null); void act(() => quotesClient.cancel(quote.id)); }}>Cancelar orçamento</Button></div>
      </Modal>
    </div>
  );
}

export default function QuoteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <PageShell permissionKey={COMERCIAL_KEYS.orcamentos}>
      {() => <Suspense fallback={null}><Details id={id} /></Suspense>}
    </PageShell>
  );
}
