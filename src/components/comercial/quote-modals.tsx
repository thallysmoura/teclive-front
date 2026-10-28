"use client";

import { useEffect, useState } from "react";
import { money, productsClient, servicesClient, toInput, toNumber } from "@/lib/cadastros";
import { refusalClient, sellersClient, type QuoteDetail, type QuoteInput, type QuoteItem, type QuoteItemInput } from "@/lib/comercial";
import { ClientPicker } from "@/components/comercial/client-picker";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";
const clean = (v: string) => v.replace(/[^\d,]/g, "");

function Actions({ saving, label, onCancel }: { saving: boolean; label: string; onCancel: () => void }) {
  return (
    <div className="mt-5 flex justify-end gap-3 border-t border-ds-border-subtle pt-4">
      <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
      <Button type="submit" disabled={saving}>{saving ? "Salvando..." : label}</Button>
    </div>
  );
}

function useSubmit(fn: () => Promise<void>, onDone: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return {
    saving, error, setError,
    submit: async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true); setError("");
      try { await fn(); onDone(); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível concluir a operação."); } finally { setSaving(false); }
    },
  };
}

export const KIND_LABEL = { PRODUCT: "Produto", SERVICE: "Serviço", RECURRING: "Serviço Recorrente" } as const;

/** Adicionar produto, serviço ou serviço recorrente ao orçamento (busca no cadastro). */
const GROUP_SUGGESTIONS = ["Sala", "Cozinha", "Quarto", "Banheiro", "Área externa", "Escritório"];

export function ItemModal({ kind, open, onClose, onSave, editing, groups = [] }: { kind: QuoteItemInput["kind"]; open: boolean; onClose: () => void; onSave: (item: QuoteItemInput) => Promise<void>; editing?: QuoteItem | null; groups?: string[] }) {
  const [group, setGroup] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; description: string; unit?: string; price: number; cost: number; identifier?: string | null }[]>([]);
  const [picked, setPicked] = useState<(typeof results)[number] | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitValue, setUnitValue] = useState("0,00");
  const [discount, setDiscount] = useState("0,00");
  const [rental, setRental] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setPicked({ id: editing.id, description: editing.description, unit: editing.unit ?? undefined, price: Number(editing.unitValue), cost: Number(editing.cost), identifier: editing.identifier });
      setQuantity(String(Number(editing.quantity)).replace(".", ",")); setUnitValue(toInput(editing.unitValue)); setDiscount(toInput(editing.discountValue)); setRental(editing.rental); setGroup(editing.groupName ?? "");
      return;
    }
    setQ(""); setPicked(null); setQuantity("1"); setUnitValue("0,00"); setDiscount("0,00"); setRental(false); setGroup("");
  }, [open, kind, editing]);

  useEffect(() => {
    if (!open || picked) return;
    const timer = setTimeout(async () => {
      try {
        if (kind === "PRODUCT") setResults((await productsClient.list({ q, page: 1 })).lista.slice(0, 20).map((p) => ({ id: p.id, description: p.description, unit: p.unit, price: Number(p.salePrice ?? 0), cost: Number(p.costPrice ?? 0), identifier: p.identifier })));
        else setResults((await servicesClient.list({ q, page: 1 })).lista.slice(0, 20).map((s) => ({ id: s.id, description: s.description, price: Number(s.price), cost: Number(s.cost) })));
      } catch { setResults([]); }
    }, 200);
    return () => clearTimeout(timer);
  }, [open, kind, q, picked]);

  const form = useSubmit(async () => {
    if (!picked) throw new Error(`Selecione ${kind === "PRODUCT" ? "o produto" : "o serviço"}.`);
    const qty = toNumber(quantity);
    if (!(qty > 0)) throw new Error("Informe uma quantidade maior que zero.");
    await onSave({ kind, description: picked.description, identifier: picked.identifier ?? undefined, unit: picked.unit, quantity: qty, unitValue: toNumber(unitValue), discountValue: toNumber(discount), cost: picked.cost, rental, groupName: kind === "RECURRING" ? null : group.trim() || null });
  }, onClose);

  const gross = toNumber(quantity) * toNumber(unitValue);
  return (
    <Modal open={open} onClose={onClose} labelledBy="quote-item-title">
      <form onSubmit={form.submit} noValidate>
        <h2 id="quote-item-title" className="mb-4 text-lg font-bold text-ds-primary-deep">{editing ? "Editar" : "Adicionar"} {KIND_LABEL[kind]}</h2>
        <div className="mb-4 flex flex-col gap-1.5">
          <FieldLabel>{kind === "PRODUCT" ? "Produto" : "Serviço"} <span className="text-ds-danger">*</span></FieldLabel>
          {picked ? (
            <div className="flex items-center justify-between rounded-[10px] border border-ds-border bg-ds-bg px-3 py-2 text-sm"><span className="font-medium text-ds-text">{picked.description}</span>{!editing && <button type="button" onClick={() => setPicked(null)} className="text-xs font-semibold text-ds-primary">Trocar</button>}</div>
          ) : (
            <>
              <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pela descrição..." />
              <ul className="max-h-48 overflow-y-auto rounded-[10px] border border-ds-border-subtle">
                {results.map((r) => (
                  <li key={r.id}><button type="button" onClick={() => { setPicked(r); setUnitValue(toInput(r.price)); }} className="flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-ds-bg"><span className="truncate">{r.description}</span><span className="shrink-0 text-xs text-ds-text-secondary">{money(r.price)}</span></button></li>
                ))}
                {results.length === 0 && <li className="px-3 py-3 text-center text-sm text-ds-text-secondary">Nenhum resultado.</li>}
              </ul>
            </>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {kind !== "RECURRING" && <label className="flex flex-col gap-1.5"><FieldLabel>Quantidade</FieldLabel><Input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(clean(e.target.value))} /></label>}
          <label className="flex flex-col gap-1.5"><FieldLabel>{kind === "RECURRING" ? "Valor mensal" : "Valor unitário"}</FieldLabel><Input inputMode="decimal" value={unitValue} onChange={(e) => setUnitValue(clean(e.target.value))} /></label>
          {kind !== "RECURRING" && <label className="flex flex-col gap-1.5"><FieldLabel>Desconto (R$)</FieldLabel><Input inputMode="decimal" value={discount} onChange={(e) => setDiscount(clean(e.target.value))} /></label>}
        </div>
        {kind !== "RECURRING" && (
          <label className="mt-3 flex flex-col gap-1.5"><FieldLabel>Grupo / ambiente (opcional)</FieldLabel>
            <Input list="quote-groups" value={group} maxLength={60} onChange={(e) => setGroup(e.target.value)} placeholder="Ex.: Sala / Cozinha" />
            <datalist id="quote-groups">{[...new Set([...groups, ...GROUP_SUGGESTIONS])].map((g) => <option key={g} value={g} />)}</datalist>
          </label>
        )}
        {kind === "PRODUCT" && <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ds-text"><input type="checkbox" checked={rental} onChange={(e) => setRental(e.target.checked)} className="h-4 w-4 accent-ds-primary" />Item locado</label>}
        {kind !== "RECURRING" && <p className="mt-3 text-right text-sm text-ds-text-muted">Total: <strong className="text-ds-primary-deep">{money(Math.max(0, gross - toNumber(discount)))}</strong></p>}
        {form.error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{form.error}</p>}
        <Actions saving={form.saving} label={editing ? "Salvar" : "Adicionar"} onCancel={onClose} />
      </form>
    </Modal>
  );
}

const METHODS = ["À vista", "PIX", "Boleto", "Boleto Inter", "A prazo", "Cartão de Crédito (VISA / MASTER)", "Cartão de Crédito (AMEX)", "Transferência bancária"];

export function PaymentModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (v: { method: string; installments: number }) => Promise<void> }) {
  const [method, setMethod] = useState(METHODS[0]);
  const [installments, setInstallments] = useState("1");
  const form = useSubmit(async () => {
    const n = Math.floor(Number(installments));
    if (!(n >= 1 && n <= 48)) throw new Error("Informe de 1 a 48 parcelas.");
    await onSave({ method, installments: n });
  }, onClose);
  return (
    <Modal open={open} onClose={onClose} labelledBy="quote-payment-title">
      <form onSubmit={form.submit} noValidate>
        <h2 id="quote-payment-title" className="mb-4 text-lg font-bold text-ds-primary-deep">Adicionar Proposta de Pagamento</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <label className="flex flex-col gap-1.5"><FieldLabel>Forma de Pagamento</FieldLabel><select value={method} onChange={(e) => setMethod(e.target.value)} className={selectClass}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="flex flex-col gap-1.5"><FieldLabel>Parcelas</FieldLabel><Input inputMode="numeric" value={installments} onChange={(e) => setInstallments(e.target.value.replace(/\D/g, "").slice(0, 2))} /></label>
        </div>
        {form.error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{form.error}</p>}
        <Actions saving={form.saving} label="Adicionar" onCancel={onClose} />
      </form>
    </Modal>
  );
}

/** Ganhar: escolhe a condição de pagamento; Recusar: escolhe o motivo. */
export function DecisionModal({ quote, open, onClose, onWin, onRefuse }: { quote: QuoteDetail; open: boolean; onClose: () => void; onWin: (paymentId: string) => Promise<void>; onRefuse: (reason: string) => Promise<void> }) {
  const [mode, setMode] = useState<"win" | "refuse">("win");
  const [paymentId, setPaymentId] = useState("");
  const [reason, setReason] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    setMode("win"); setPaymentId(quote.payments.find((p) => p.selected)?.id ?? quote.payments[0]?.id ?? ""); setReason("");
    refusalClient.list({ page: 1 }).then((r) => setReasons(r.lista.map((x) => x.description))).catch(() => {});
  }, [open, quote]);
  const form = useSubmit(async () => {
    if (mode === "win") { if (!paymentId) throw new Error("Selecione a condição de pagamento."); await onWin(paymentId); }
    else { if (!reason) throw new Error("Selecione o motivo da recusa."); await onRefuse(reason); }
  }, onClose);
  return (
    <Modal open={open} onClose={onClose} labelledBy="quote-decision-title">
      <form onSubmit={form.submit} noValidate>
        <h2 id="quote-decision-title" className="mb-4 text-lg font-bold text-ds-primary-deep">Ganhar / Recusar orçamento</h2>
        <div className="mb-4 inline-flex overflow-hidden rounded-lg border border-ds-primary-deep">
          {([["win", "Ganhar"], ["refuse", "Recusar"]] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setMode(value)} className={`px-4 py-2 text-sm font-semibold ${mode === value ? "bg-ds-primary-deep text-white" : "bg-white text-ds-primary-deep"}`}>{label}</button>
          ))}
        </div>
        {mode === "win" ? (
          quote.payments.length === 0 ? <p className="text-sm text-ds-text-muted">Cadastre ao menos uma proposta de pagamento na aba &quot;Formas de Pagamento&quot; antes de ganhar o orçamento.</p> : (
            <fieldset className="flex flex-col gap-2"><legend className="mb-1 text-xs font-bold uppercase tracking-wider text-ds-text-secondary">Condição de pagamento</legend>
              {quote.payments.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-ds-border-subtle px-3 py-2 text-sm"><input type="radio" name="payment" checked={paymentId === p.id} onChange={() => setPaymentId(p.id)} className="accent-ds-primary" />{p.installments}x · {p.method}<span className="ml-auto font-semibold text-ds-primary-deep">{money(quote.totals.total)}</span></label>
              ))}
            </fieldset>
          )
        ) : (
          <label className="flex flex-col gap-1.5"><FieldLabel>Motivo da recusa</FieldLabel>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={selectClass}><option value="">Selecione...</option>{reasons.map((r) => <option key={r}>{r}</option>)}</select>
            {reasons.length === 0 && <span className="text-xs text-ds-text-secondary">Nenhum motivo cadastrado. Cadastre em Comercial › Motivos de Recusa de Orçamento.</span>}
          </label>
        )}
        {form.error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{form.error}</p>}
        <Actions saving={form.saving} label={mode === "win" ? "Ganhar orçamento" : "Recusar orçamento"} onCancel={onClose} />
      </form>
    </Modal>
  );
}

/** Dados básicos: cliente, vendedor, validade e título. */
export function BasicModal({ quote, open, onClose, onSave }: { quote: QuoteDetail; open: boolean; onClose: () => void; onSave: (input: QuoteInput) => Promise<void> }) {
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [seller, setSeller] = useState("");
  const [sellers, setSellers] = useState<string[]>([]);
  const [validUntil, setValidUntil] = useState("");
  const [title, setTitle] = useState("");
  useEffect(() => {
    if (!open) return;
    setClient(quote.personId ? { id: quote.personId, name: quote.personName } : null); setSeller(quote.sellerName ?? ""); setValidUntil(quote.validUntil.slice(0, 10)); setTitle(quote.title ?? "");
    sellersClient.list().then((r) => setSellers(r.map((s) => s.name))).catch(() => {});
  }, [open, quote]);
  const form = useSubmit(async () => {
    if (!client) throw new Error("Selecione o cliente.");
    if (!validUntil) throw new Error("Informe a validade.");
    await onSave({ personId: client.id, sellerName: seller, validUntil, title });
  }, onClose);
  const options = seller && !sellers.includes(seller) ? [seller, ...sellers] : sellers;
  return (
    <Modal open={open} onClose={onClose} labelledBy="quote-basic-title">
      <form onSubmit={form.submit} noValidate>
        <h2 id="quote-basic-title" className="mb-4 text-lg font-bold text-ds-primary-deep">Dados Básicos</h2>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5"><FieldLabel>Cliente</FieldLabel><ClientPicker value={client} onChange={setClient} /></label>
          <label className="flex flex-col gap-1.5"><FieldLabel>Título</FieldLabel><Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><FieldLabel>Vendedor</FieldLabel><select value={seller} onChange={(e) => setSeller(e.target.value)} className={selectClass}><option value="">Selecione...</option>{options.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="flex flex-col gap-1.5"><FieldLabel>Validade</FieldLabel><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></label>
          </div>
        </div>
        {form.error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{form.error}</p>}
        <Actions saving={form.saving} label="Salvar" onCancel={onClose} />
      </form>
    </Modal>
  );
}

/** Edição de texto longo (ficha técnica e observação). */
export function TextModal({ title, initial, open, onClose, onSave }: { title: string; initial: string; open: boolean; onClose: () => void; onSave: (value: string) => Promise<void> }) {
  const [value, setValue] = useState(initial);
  useEffect(() => { if (open) setValue(initial); }, [open, initial]);
  const form = useSubmit(async () => { await onSave(value); }, onClose);
  return (
    <Modal open={open} onClose={onClose} wide labelledBy="quote-text-title">
      <form onSubmit={form.submit} noValidate>
        <h2 id="quote-text-title" className="mb-4 text-lg font-bold text-ds-primary-deep">{title}</h2>
        <textarea autoFocus value={value} onChange={(e) => setValue(e.target.value)} rows={14} className="w-full rounded-[10px] border border-ds-border bg-white px-3 py-2 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" />
        {form.error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{form.error}</p>}
        <Actions saving={form.saving} label="Salvar" onCancel={onClose} />
      </form>
    </Modal>
  );
}

const MAX_ATTACHMENT = 500 * 1024;

/** Anexar arquivo ao orçamento (até 500 KB), com legenda opcional. */
export function AttachmentModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (file: File, caption: string) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  useEffect(() => { if (open) { setFile(null); setCaption(""); } }, [open]);
  const form = useSubmit(async () => {
    if (!file) throw new Error("Selecione o arquivo.");
    if (file.size > MAX_ATTACHMENT) throw new Error("O arquivo deve ter no máximo 500 KB.");
    await onSave(file, caption);
  }, onClose);
  return (
    <Modal open={open} onClose={onClose} labelledBy="quote-attachment-title">
      <form onSubmit={form.submit} noValidate>
        <h2 id="quote-attachment-title" className="mb-4 text-lg font-bold text-ds-primary-deep">Adicionar Anexo</h2>
        <label className="mb-4 flex flex-col gap-1.5"><FieldLabel>Arquivo <span className="text-ds-danger">*</span></FieldLabel>
          <input type="file" onChange={(e) => { setFile(e.target.files?.[0] ?? null); form.setError(""); }} className="text-sm file:mr-3 file:rounded-lg file:border file:border-ds-primary-deep file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ds-primary-deep" />
          <span className="text-xs text-ds-text-secondary">Tamanho máximo: 500 KB.</span>
        </label>
        <label className="flex flex-col gap-1.5"><FieldLabel>Legenda</FieldLabel><Input value={caption} maxLength={200} onChange={(e) => setCaption(e.target.value)} placeholder="Descreva o anexo" /></label>
        {form.error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{form.error}</p>}
        <Actions saving={form.saving} label="Anexar" onCancel={onClose} />
      </form>
    </Modal>
  );
}
