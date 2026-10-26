"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { ADJUST_INDEXES, CONTRACT_STATUS, CONTRATOS_KEY, UNITS, addressLine, contractsApi, dateBr, fmtDoc, months, type Address, type ContractDetail, type ContractInvoice, type Lookups } from "@/lib/contratos";
import { money } from "@/lib/cadastros";
import { authFetch } from "@/lib/api";
import { AI_REPORT_KEY } from "@/components/relatorios/ai-report-modal";

type Tab = "geral" | "faturas" | "bonificacoes" | "produtos" | "monitoramento" | "historico";
type Dialog = { kind: "basic" | "period" | "billing" | "extra" | "note" | "status" } | { kind: "invoice"; invoice: ContractInvoice | null } | { kind: "product"; invoice: ContractInvoice } | null;

const input = "h-10 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";
const lab = "mb-1 block text-xs font-bold text-ds-text-secondary";
const iso = (v: string | null) => (v ? v.slice(0, 10) : "");

function Card({ icon, title, onEdit, children }: { icon: string; title: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ds-border-subtle bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-ds-border-subtle px-4 py-2.5"><h3 className="flex items-center gap-2 text-sm font-extrabold text-ds-primary-deep"><Icon name={icon} className="text-[18px] text-ds-text-secondary" />{title}</h3>{onEdit && <button type="button" onClick={onEdit} className="text-xs font-bold text-ds-primary hover:underline">Editar</button>}</header>
      <div className="p-4">{children}</div>
    </section>
  );
}
const Info = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="min-w-0"><span className="block text-[11px] font-bold text-ds-text-secondary">{k}</span><span className="block break-words text-sm text-ds-text">{v || "-"}</span></div>;

function Dlg({ title, onClose, onSave, saving, error, children, saveLabel = "Salvar" }: { title: string; onClose: () => void; onSave: () => void; saving: boolean; error: string; children: React.ReactNode; saveLabel?: string }) {
  return (
    <Modal open onClose={onClose} labelledBy="dlg-title">
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <h2 id="dlg-title" className="mb-4 text-lg font-extrabold text-ds-primary-deep">{title}</h2>
        <div className="space-y-3">{children}</div>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-ds-danger-text">{error}</p>}
        <div className="mt-5 flex gap-2"><button type="button" onClick={onClose} className="h-11 flex-1 rounded-[10px] border border-ds-border text-sm font-semibold text-ds-text-muted">Cancelar</button><button type="submit" disabled={saving} className="h-11 flex-1 rounded-[10px] bg-[#F7941D] text-sm font-bold text-white hover:bg-[#E5850F] disabled:opacity-60">{saving ? "Salvando..." : saveLabel}</button></div>
      </form>
    </Modal>
  );
}

function ContractView({ id }: { id: string }) {
  const router = useRouter();
  const [c, setC] = useState<ContractDetail | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [tab, setTab] = useState<Tab>("geral");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [openInvoice, setOpenInvoice] = useState<string | null>(null);
  const [warnOpen, setWarnOpen] = useState(false);
  // campos dos diálogos
  const [f, setF] = useState<Record<string, string>>({});
  const [found, setFound] = useState<{ id: string; description: string }[]>([]);
  const set = (k: string, v: string) => setF((cur) => ({ ...cur, [k]: v }));

  const load = useCallback(() => contractsApi.detail(id).then(setC).catch((e) => setError(e instanceof Error ? e.message : "Contrato não encontrado.")), [id]);
  useEffect(() => { void load(); void contractsApi.lookups().then(setLookups).catch(() => undefined); }, [load]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const aba = q.get("aba") as Tab | null;
    if (aba) setTab(aba);
    if (q.get("novaFatura") === "1") openDialog({ kind: "invoice", invoice: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (c && new URLSearchParams(window.location.search).get("imprimir") === "1") void printContract(c); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [c?.id]);
  useEffect(() => {
    if (dialog?.kind !== "product") return;
    const t = setTimeout(() => void contractsApi.searchProducts(f.q ?? "").then((r) => setFound(r.lista.slice(0, 10))).catch(() => setFound([])), 250);
    return () => clearTimeout(t);
  }, [dialog, f.q]);

  function openDialog(d: NonNullable<Dialog>) {
    setError(""); setFound([]);
    if (!c && d.kind !== "invoice") return;
    if (d.kind === "basic") setF({ seller: c!.sellerName ?? "", group: c!.billingGroup?.id ?? "" });
    else if (d.kind === "period") setF({ start: iso(c!.startDate), end: iso(c!.endDate), indefinite: c!.endDate ? "" : "1" });
    else if (d.kind === "billing") setF({ day: String(c!.billingDay), method: c!.paymentMethod?.id ?? "" });
    else if (d.kind === "extra") setF({ penalty: String(c!.penaltyPercent), index: String(c!.adjustIndex ?? ""), allow: c!.allowAdjust ? "1" : "" });
    else if (d.kind === "note") setF({ note: c!.observation ?? "" });
    else if (d.kind === "status") setF({ status: String(c!.status) });
    else if (d.kind === "invoice") { const a = d.invoice?.address; setF({ description: d.invoice?.description ?? "", value: d.invoice ? String(d.invoice.netValue) : "", title: a?.title ?? "", street: a?.street ?? "", number: a?.number ?? "", district: a?.district ?? "", zip: a?.zip ?? "", city: a?.city ?? "", state: a?.state ?? "", complement: a?.complement ?? "" }); }
    else setF({ q: "", product: "", productName: "", sale: "1", rental: "0", gratuity: "0", warranty: "0" });
    setDialog(d);
  }

  async function run(fn: () => Promise<unknown>) {
    setSaving(true); setError("");
    try { await fn(); await load(); setDialog(null); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); } finally { setSaving(false); }
  }

  const save = () => {
    if (!dialog || !c) return;
    const k = dialog.kind;
    if (k === "basic") return run(() => contractsApi.update(id, { sellerName: f.seller || null, billingGroupId: f.group || null }));
    if (k === "period") return run(() => contractsApi.update(id, { startDate: f.start, endDate: f.indefinite ? null : f.end || null }));
    if (k === "billing") return run(() => contractsApi.update(id, { billingDay: Number(f.day), paymentMethodId: f.method || null }));
    if (k === "extra") return run(() => contractsApi.update(id, { penaltyPercent: Number(f.penalty || 0), adjustIndex: f.index ? Number(f.index) : null, allowAdjust: !!f.allow }));
    if (k === "note") return run(() => contractsApi.update(id, { observation: f.note }));
    if (k === "status") return run(() => contractsApi.update(id, { status: Number(f.status) }));
    if (k === "invoice") {
      const address: Address = { title: f.title, street: f.street, number: f.number, district: f.district, zip: f.zip, city: f.city, state: f.state, complement: f.complement };
      const body = { description: f.description, netValue: Number(String(f.value).replace(",", ".") || 0), address };
      return run(() => (dialog.invoice ? contractsApi.updateInvoice(id, dialog.invoice.id, body) : contractsApi.addInvoice(id, body)));
    }
    if (dialog.kind !== "product") return;
    return run(() => contractsApi.addProduct(id, dialog.invoice.id, { productId: f.product, sale: Number(f.sale), rental: Number(f.rental), gratuity: Number(f.gratuity), warranty: Number(f.warranty) }));
  };

  async function removeInvoice(inv: ContractInvoice) {
    if (!confirm(`Remover a fatura "${inv.description}" e seus produtos do contrato?`)) return;
    await contractsApi.removeInvoice(id, inv.id).then(load).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível remover."));
  }
  async function removeProduct(inv: ContractInvoice, pid: string, name: string) {
    if (!confirm(`Remover o produto "${name}" do contrato?`)) return;
    await contractsApi.removeProduct(id, inv.id, pid).then(load).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível remover."));
  }
  async function removeContract() {
    if (!c || !confirm(`Excluir o contrato ${c.number}? Essa ação não pode ser desfeita.`)) return;
    await contractsApi.remove(id).then(() => router.push("/contratos")).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível excluir."));
  }

  async function printContract(d: ContractDetail) {
    const [me, company] = await Promise.all([
      authFetch("/auth/me").then((r) => r.json()).catch(() => null),
      authFetch("/company").then((r) => r.json()).catch(() => null),
    ]);
    const dur = months(d.startDate, d.endDate);
    const report = {
      title: `Contrato ${d.number}`,
      company: company?.legalName || company?.tradeName || "Teclive",
      generatedBy: me?.name ?? "",
      generatedAt: new Date().toISOString(),
      filters: [["Contrato:", d.number], ["Cliente:", d.person.name], ["Vigência:", `${dateBr(d.startDate)} a ${d.endDate ? dateBr(d.endDate) : "indeterminado"}`], ["Situação:", CONTRACT_STATUS[d.status]?.label ?? String(d.status)]],
      sections: [
        { title: "Dados do contrato", summary: [["Cliente", d.person.name], ["CPF/CNPJ", fmtDoc(d.person.document, d.person.type)], ["Vendedor", d.sellerName || "-"], ["Grupo de faturamento", d.billingGroup?.description || "-"], ["Forma de pagamento", d.paymentMethod?.description || "-"], ["Dia de vencimento", `${d.billingDay}º dia`], ["Duração", dur === null ? "Indeterminado" : `${dur} meses`], ["Multa de rescisão", `${d.penaltyPercent}%`], ["Índice de reajuste", d.adjustIndex ? (ADJUST_INDEXES[d.adjustIndex] ?? String(d.adjustIndex)).split(" - ")[0] : "-"], ["Valor bruto", money(d.totalGross)], ["Valor líquido", money(d.totalNet)]], ...(d.observation ? { note: `Observação: ${d.observation}` } : {}) },
        { title: "Faturas", columns: [{ label: "Descrição", width: 200 }, { label: "Endereço de prestação", width: 339 }, { label: "Serviços", width: 50, align: "center" }, { label: "Valor", width: 100, align: "right" }], rows: d.invoices.map((i) => [i.description, addressLine(i.address), String(i.serviceCount), money(i.netValue)]) },
        { title: "Produtos", columns: [{ label: "Fatura", width: 150 }, { label: "Produto", width: 289 }, { label: "Venda", width: 62, align: "right" }, { label: "Locação", width: 62, align: "right" }, { label: "Gratif.", width: 63, align: "right" }, { label: "Garantia", width: 63, align: "right" }], rows: d.invoices.flatMap((i) => i.products.map((p) => [i.description, p.description, String(p.sale), String(p.rental), String(p.gratuity), String(p.warranty)])) },
      ],
    };
    try { sessionStorage.setItem(AI_REPORT_KEY, JSON.stringify(report)); } catch { /* sem armazenamento */ }
    router.push("/relatorios/ia");
  }

  if (error && !c) return <p role="alert" className="py-16 text-center text-sm text-ds-danger-text">{error}</p>;
  if (!c) return <p className="py-16 text-center text-sm text-ds-text-secondary">Carregando...</p>;

  const dur = months(c.startDate, c.endDate);
  const productCount = c.invoices.reduce((s, i) => s + i.products.length, 0);
  const tabBtn = (t: Tab, text: string) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px whitespace-nowrap rounded-t-lg border border-b-0 px-4 py-2 text-xs font-bold transition-colors ${tab === t ? "border-ds-border-subtle bg-white text-ds-primary-deep" : "border-transparent text-ds-primary hover:text-ds-primary-deep"}`}>{text}</button>;

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Contratos", href: "/contratos" }, { label: "Detalhes do Contrato" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Detalhes do Contrato</h1>
        <div className="flex items-center gap-2">
          <Link href="/contratos" className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-ds-border bg-white px-4 text-sm font-semibold text-ds-primary-deep hover:border-ds-primary"><Icon name="arrow_back" className="text-[18px]" />Voltar</Link>
          <button type="button" onClick={() => void printContract(c)} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-ds-border bg-white px-4 text-sm font-semibold text-ds-primary-deep hover:border-ds-primary"><Icon name="description" className="text-[18px]" />Visualizar Contrato</button>
        </div>
      </header>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-ds-border-subtle bg-white shadow-sm">
          <div className="border-b border-ds-border-subtle p-4">
            <p className="text-xs font-bold text-ds-text-secondary">{c.number}</p>
            <div className="my-3 flex justify-center"><span className="flex h-24 w-24 items-center justify-center rounded-full bg-ds-bg text-ds-text-secondary"><Icon name="contract_edit" className="text-[48px]" /></span></div>
            <p className="text-center text-sm font-extrabold uppercase leading-snug text-ds-primary-deep">{c.person.name}</p>
            <p className="mt-1 text-center text-xs text-ds-text-secondary">{fmtDoc(c.person.document, c.person.type)}</p>
            <p className="mt-2 text-center"><button type="button" onClick={() => openDialog({ kind: "status" })} className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CONTRACT_STATUS[c.status]?.cls ?? ""}`}>{CONTRACT_STATUS[c.status]?.label}</button></p>
          </div>
          <div className="border-b border-ds-border-subtle p-4"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-extrabold text-ds-primary-deep">Dados Básicos</h3><button type="button" onClick={() => openDialog({ kind: "basic" })} className="text-xs font-bold text-ds-primary hover:underline">Editar</button></div><div className="space-y-3"><Info k="Vendedor" v={c.sellerName || "Não informado"} /><Info k="Grupo de Faturamento" v={c.billingGroup?.description} /></div></div>
          <div className="p-4"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-extrabold text-ds-primary-deep">Período de Vigência</h3><button type="button" onClick={() => openDialog({ kind: "period" })} className="text-xs font-bold text-ds-primary hover:underline">Redefinir</button></div>
            <div className="space-y-3"><Info k="Início da Vigência" v={dateBr(c.startDate)} /><Info k="Fim da Vigência" v={c.endDate ? dateBr(c.endDate) : "Indeterminado"} /></div>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-ds-border-subtle bg-ds-bg/60 px-3 py-2.5"><Icon name="schedule" className="text-[24px] text-ds-text-secondary" /><span className="leading-tight"><span className="block text-[11px] text-ds-text-secondary">Duração</span><span className="block text-sm font-bold text-[#12A262]">{dur === null ? "Indeterminado" : `${dur} ${dur === 1 ? "Mês" : "Meses"}`}</span></span></div>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px]">
            <button type="button" onClick={() => setWarnOpen((v) => !v)} className="flex items-center gap-3 rounded-2xl border border-ds-border-subtle bg-white p-3 text-left shadow-sm"><Icon name="campaign" className="text-[28px] text-ds-text-secondary" /><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ds-primary-deep">Painel de Avisos <span className="font-normal text-ds-text-secondary">(0 aviso)</span></span><span className="block text-xs text-ds-text-secondary">{warnOpen ? "Nenhum aviso pendente para este contrato." : "Painel com avisos referente ao cliente do contrato"}</span></span><Icon name={warnOpen ? "expand_less" : "expand_more"} className="text-[22px] text-ds-text-secondary" /></button>
            <div className="rounded-2xl border border-ds-border-subtle bg-white p-3 shadow-sm"><span className="block text-[11px] font-bold text-ds-text-secondary">Total Bruto</span><span className="block text-base font-extrabold text-ds-primary-deep">{money(c.totalGross)}</span></div>
            <div className="rounded-2xl border border-ds-border-subtle bg-white p-3 shadow-sm"><span className="block text-[11px] font-bold text-ds-text-secondary">Total Líquido</span><span className="block text-base font-extrabold text-ds-primary-deep">{money(c.totalNet)}</span></div>
          </div>

          <div>
            <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-ds-border-subtle">{tabBtn("geral", "Dados Gerais")}{tabBtn("faturas", `Faturas (${c.invoices.length})`)}{tabBtn("bonificacoes", "Bonificações/Despesas")}{tabBtn("produtos", `Produtos (${productCount})`)}{tabBtn("monitoramento", "Monitoramento")}{tabBtn("historico", "Histórico")}</div>
            <div className="rounded-b-2xl border border-t-0 border-ds-border-subtle bg-white p-4 shadow-sm">
              {tab === "geral" && (
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-4">
                    <Card icon="payments" title="Dados de Cobrança" onEdit={() => openDialog({ kind: "billing" })}><div className="grid gap-4 sm:grid-cols-2"><Info k="Dia do Vencimento" v={`${c.billingDay}º dia`} /><Info k="Forma de Pagamento" v={c.paymentMethod?.description} /></div></Card>
                    <Card icon="tune" title="Dados Complementares" onEdit={() => openDialog({ kind: "extra" })}><div className="grid gap-4 sm:grid-cols-2"><Info k="Multa de Rescisão" v={`${c.penaltyPercent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`} /><Info k="Índice de Reajuste" v={c.adjustIndex ? ADJUST_INDEXES[c.adjustIndex] : "Sem reajuste"} /></div></Card>
                  </div>
                  <Card icon="notes" title="Observação" onEdit={() => openDialog({ kind: "note" })}><p className="whitespace-pre-wrap text-sm text-ds-text">{c.observation || <span className="text-ds-text-secondary">Não informado</span>}</p></Card>
                </div>
              )}

              {tab === "faturas" && (
                <div>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold text-ds-primary-deep">Faturas ({c.invoices.length})</h3><p className="max-w-xl text-xs text-ds-text-secondary">Cada fatura adicionada ao contrato gera uma NFS-e ou Recibo de Locação, permitindo a emissão de múltiplas faturas em momentos distintos para o mesmo contrato.</p></div><button type="button" onClick={() => openDialog({ kind: "invoice", invoice: null })} className="inline-flex h-9 items-center rounded-[10px] border border-[#F7941D] px-4 text-sm font-bold text-[#E5850F] hover:bg-[#F7941D]/10">Adicionar</button></div>
                  {c.invoices.length === 0 ? <p className="rounded-xl border border-dashed border-ds-border py-8 text-center text-sm text-ds-text-secondary">Nenhuma fatura neste contrato ainda.</p> : <ul className="divide-y divide-ds-border-subtle rounded-xl border border-ds-border-subtle">{c.invoices.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3"><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ds-primary-deep">{i.description}{i.canceled && <span className="ml-2 rounded-full bg-[#FDE6E4] px-2 text-[10px] text-[#B42318]">Cancelada</span>}</span><span className="mt-0.5 flex items-center gap-1 text-xs text-ds-text-secondary"><Icon name="location_on" className="text-[14px]" />{addressLine(i.address) || "Sem endereço"}</span></span><span className="text-center"><span className="block text-sm font-bold text-ds-primary-deep">{i.serviceCount}</span><span className="block text-[10px] text-ds-text-secondary">Serviço Vigente</span></span><span className="w-28 text-right text-sm font-bold text-ds-primary-deep">{money(i.netValue)}</span>
                      <span className="flex gap-1"><button type="button" onClick={() => openDialog({ kind: "invoice", invoice: i })} aria-label="Editar fatura" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-primary hover:border-ds-primary"><Icon name="edit_square" className="text-[18px]" /></button><button type="button" onClick={() => void removeInvoice(i)} aria-label="Remover fatura" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-[#E5322D] hover:border-[#E5322D]"><Icon name="delete" className="text-[18px]" /></button></span></li>
                  ))}</ul>}
                </div>
              )}

              {tab === "produtos" && (
                <div>
                  <div className="mb-3"><h3 className="text-lg font-extrabold text-ds-primary-deep">Produtos ({productCount})</h3></div>
                  {c.invoices.length === 0 ? <p className="rounded-xl border border-dashed border-ds-border py-8 text-center text-sm text-ds-text-secondary">Adicione uma fatura para vincular produtos.</p> : <ul className="space-y-3">{c.invoices.map((i) => (
                    <li key={i.id} className="rounded-xl border border-ds-border-subtle">
                      <div className="flex flex-wrap items-center gap-3 px-4 py-3"><button type="button" onClick={() => setOpenInvoice(openInvoice === i.id ? null : i.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ds-primary-deep">{i.description}</span><span className="mt-0.5 flex items-center gap-1 text-xs text-ds-text-secondary"><Icon name="location_on" className="text-[14px]" />{addressLine(i.address) || "Sem endereço"}</span></span><span className="rounded-full border border-[#F7941D] px-2 py-0.5 text-[11px] font-bold text-[#E5850F]">{i.products.length} Produto(s)</span><Icon name={openInvoice === i.id ? "expand_less" : "expand_more"} className="text-[22px] text-ds-text-secondary" /></button><button type="button" onClick={() => openDialog({ kind: "product", invoice: i })} className="inline-flex h-8 items-center rounded-[10px] border border-[#F7941D] px-3 text-xs font-bold text-[#E5850F] hover:bg-[#F7941D]/10">Adicionar</button></div>
                      {openInvoice === i.id && (
                        <div className="overflow-x-auto border-t border-ds-border-subtle"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-[11px] uppercase tracking-wide text-ds-text-secondary"><tr><th className="px-4 py-2">Produto</th><th className="px-2 py-2 text-right">Venda</th><th className="px-2 py-2 text-right">Locação</th><th className="px-2 py-2 text-right">Gratif.</th><th className="px-2 py-2 text-right">Garantia</th><th className="w-10" /></tr></thead><tbody>{i.products.length === 0 ? <tr><td colSpan={6} className="px-4 py-4 text-center text-ds-text-secondary">Sem produtos nesta fatura.</td></tr> : i.products.map((p) => <tr key={p.id} className="border-t border-ds-border-subtle"><td className="px-4 py-2 font-medium text-ds-text">{p.description}<span className="ml-2 text-xs text-ds-text-secondary">{UNITS[p.unitMeasure] ?? ""}</span></td><td className="px-2 py-2 text-right">{p.sale}</td><td className="px-2 py-2 text-right">{p.rental}</td><td className="px-2 py-2 text-right">{p.gratuity}</td><td className="px-2 py-2 text-right">{p.warranty}</td><td className="pr-3 text-right"><button type="button" onClick={() => void removeProduct(i, p.id, p.description)} aria-label="Remover produto" className="text-[#E5322D]"><Icon name="close" className="text-[18px]" /></button></td></tr>)}</tbody></table></div>
                      )}
                    </li>
                  ))}</ul>}
                </div>
              )}

              {tab === "bonificacoes" && <div className="py-10 text-center"><Icon name="redeem" className="!text-[44px] text-ds-border" /><p className="mt-2 text-sm text-ds-text-secondary">Nenhuma bonificação ou despesa lançada neste contrato.</p></div>}
              {tab === "monitoramento" && <div className="py-10 text-center"><Icon name="videocam" className="!text-[44px] text-ds-border" /><p className="mt-2 text-sm text-ds-text-secondary">Nenhum equipamento de monitoramento vinculado a este contrato.</p></div>}
              {tab === "historico" && (
                c.history.length === 0 ? <p className="py-8 text-center text-sm text-ds-text-secondary">Sem registros no histórico.</p> : <ul className="divide-y divide-ds-border-subtle">{c.history.map((h) => <li key={h.id} className="flex gap-3 py-3"><span className="w-32 shrink-0 text-xs text-ds-text-secondary">{new Date(h.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span><span className="min-w-0 flex-1 text-sm text-ds-text">{h.description}</span></li>)}</ul>
              )}
            </div>
          </div>
          <div className="flex justify-end"><button type="button" onClick={() => void removeContract()} className="text-xs font-semibold text-[#E5322D] hover:underline">Excluir contrato</button></div>
        </div>
      </div>

      {dialog?.kind === "basic" && <Dlg title="Dados Básicos" onClose={() => setDialog(null)} onSave={save} saving={saving} error={error}><label className="block"><span className={lab}>Vendedor</span><select className={input} value={f.seller} onChange={(e) => set("seller", e.target.value)}><option value="">Não informado</option>{lookups?.sellers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select></label><label className="block"><span className={lab}>Grupo de Faturamento</span><select className={input} value={f.group} onChange={(e) => set("group", e.target.value)}>{lookups?.billingGroups.map((g) => <option key={g.id} value={g.id}>{g.description}</option>)}</select></label></Dlg>}
      {dialog?.kind === "period" && <Dlg title="Período de Vigência" onClose={() => setDialog(null)} onSave={save} saving={saving} error={error}><label className="block"><span className={lab}>Início da Vigência</span><input type="date" className={input} value={f.start} onChange={(e) => set("start", e.target.value)} /></label><label className="block"><span className={lab}>Fim da Vigência</span><input type="date" className={input} value={f.end} disabled={!!f.indefinite} onChange={(e) => set("end", e.target.value)} /></label><label className="flex items-center gap-2 text-sm text-ds-text-muted"><input type="checkbox" checked={!!f.indefinite} onChange={(e) => set("indefinite", e.target.checked ? "1" : "")} className="h-4 w-4 accent-[#005CD2]" />Vigência indeterminada</label></Dlg>}
      {dialog?.kind === "billing" && <Dlg title="Dados de Cobrança" onClose={() => setDialog(null)} onSave={save} saving={saving} error={error}><label className="block"><span className={lab}>Dia do Vencimento</span><input type="number" min={1} max={31} className={input} value={f.day} onChange={(e) => set("day", e.target.value)} /></label><label className="block"><span className={lab}>Forma de Pagamento</span><select className={input} value={f.method} onChange={(e) => set("method", e.target.value)}>{lookups?.paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.description}</option>)}</select></label></Dlg>}
      {dialog?.kind === "extra" && <Dlg title="Dados Complementares" onClose={() => setDialog(null)} onSave={save} saving={saving} error={error}><label className="block"><span className={lab}>Multa de Rescisão (%)</span><input type="number" min={0} max={100} step="0.01" className={input} value={f.penalty} onChange={(e) => set("penalty", e.target.value)} /></label><label className="block"><span className={lab}>Índice de Reajuste</span><select className={input} value={f.index} onChange={(e) => set("index", e.target.value)}><option value="">Sem reajuste</option>{Object.entries(ADJUST_INDEXES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><label className="flex items-center gap-2 text-sm text-ds-text-muted"><input type="checkbox" checked={!!f.allow} onChange={(e) => set("allow", e.target.checked ? "1" : "")} className="h-4 w-4 accent-[#005CD2]" />Permitir reajuste do contrato</label></Dlg>}
      {dialog?.kind === "note" && <Dlg title="Observação" onClose={() => setDialog(null)} onSave={save} saving={saving} error={error}><textarea rows={6} maxLength={2000} className="w-full resize-none rounded-[10px] border border-ds-border px-3 py-2.5 text-sm outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" value={f.note} onChange={(e) => set("note", e.target.value)} /></Dlg>}
      {dialog?.kind === "status" && <Dlg title="Situação do contrato" onClose={() => setDialog(null)} onSave={save} saving={saving} error={error}><select className={input} value={f.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(CONTRACT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Dlg>}
      {dialog?.kind === "invoice" && <Dlg title={dialog.invoice ? "Editar Fatura" : "Adicionar Fatura"} onClose={() => setDialog(null)} onSave={save} saving={saving} error={error}>
        <label className="block"><span className={lab}>Descrição *</span><input className={input} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex.: Manutenção CFTV" /></label>
        <label className="block"><span className={lab}>Valor líquido (R$)</span><input inputMode="decimal" className={input} value={f.value} onChange={(e) => set("value", e.target.value)} placeholder="0,00" /></label>
        <p className="pt-1 text-xs font-bold text-ds-text-secondary">Endereço de prestação</p>
        <div className="grid grid-cols-3 gap-2"><label className="col-span-2 block"><span className={lab}>Logradouro</span><input className={input} value={f.street} onChange={(e) => set("street", e.target.value)} /></label><label className="block"><span className={lab}>Número</span><input className={input} value={f.number} onChange={(e) => set("number", e.target.value)} /></label></div>
        <div className="grid grid-cols-2 gap-2"><label className="block"><span className={lab}>Bairro</span><input className={input} value={f.district} onChange={(e) => set("district", e.target.value)} /></label><label className="block"><span className={lab}>Complemento</span><input className={input} value={f.complement} onChange={(e) => set("complement", e.target.value)} /></label></div>
        <div className="grid grid-cols-3 gap-2"><label className="block"><span className={lab}>CEP</span><input className={input} value={f.zip} onChange={(e) => set("zip", e.target.value)} /></label><label className="block"><span className={lab}>Cidade</span><input className={input} value={f.city} onChange={(e) => set("city", e.target.value)} /></label><label className="block"><span className={lab}>UF</span><input className={input} maxLength={2} value={f.state} onChange={(e) => set("state", e.target.value.toUpperCase())} /></label></div>
      </Dlg>}
      {dialog?.kind === "product" && <Dlg title={`Adicionar produto — ${dialog.invoice.description}`} onClose={() => setDialog(null)} onSave={save} saving={saving} error={error} saveLabel="Adicionar">
        <div><span className={lab}>Produto *</span>{f.product ? <div className="flex items-center justify-between rounded-[10px] border border-ds-border bg-ds-bg/60 px-3 py-2 text-sm"><span className="font-semibold text-ds-primary-deep">{f.productName}</span><button type="button" onClick={() => { set("product", ""); set("productName", ""); }} className="text-xs font-bold text-ds-primary">Trocar</button></div> : <><input autoFocus className={input} value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Buscar produto..." /><ul className="mt-1 max-h-44 overflow-y-auto rounded-[10px] border border-ds-border-subtle">{found.length === 0 && <li className="px-3 py-2 text-sm text-ds-text-secondary">Nenhum produto encontrado.</li>}{found.map((p) => <li key={p.id}><button type="button" onClick={() => { set("product", p.id); set("productName", p.description); }} className="w-full px-3 py-2 text-left text-sm hover:bg-ds-bg">{p.description}</button></li>)}</ul></>}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([["sale", "Venda"], ["rental", "Locação"], ["gratuity", "Gratificação"], ["warranty", "Garantia"]] as const).map(([k, t]) => <label key={k} className="block"><span className={lab}>{t}</span><input type="number" min={0} className={input} value={f[k]} onChange={(e) => set(k, e.target.value)} /></label>)}</div>
      </Dlg>}
    </div>
  );
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PageShell permissionKey={CONTRATOS_KEY}>{() => <ContractView id={id} />}</PageShell>;
}
