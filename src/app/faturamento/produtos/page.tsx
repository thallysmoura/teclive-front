"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { ClientPicker } from "@/components/comercial/client-picker";
import { Icon } from "@/components/ui/icon";
import { money } from "@/lib/cadastros";
import { FAT_KEYS, billing, isoDay } from "@/lib/faturamento";

const OPS = [
  { key: "produtos", label: "Faturamento de Produtos", kind: "P", cat: "Receita de Instalação (Projetos Novos)", extra: "CFOP 5102 - Venda de mercadoria adquirida ou recebida de terceiros (interestadual 6102) · Tipo de Lançamento: Saída · Precificação: Venda" },
  { key: "garantia", label: "Faturamento de Garantia", kind: "P", cat: "Garantia", extra: "Sem cobrança ao cliente; baixa de estoque." },
  { key: "brinde", label: "Faturamento Brinde", kind: "P", cat: "Brindes", extra: "Sem cobrança ao cliente." },
  { key: "locacao", label: "Comodato/Locação de Equipamentos", kind: "P", cat: "Receita de Locação de Equipamentos", extra: "Remessa em comodato/locação." },
  { key: "os-s", label: "Faturamento de Serviços da OS", kind: "S", cat: "Receita de Instalação (Projetos Novos)", extra: "Use a tela Faturamento de Ordem de Serviço.", href: "/faturamento/ordem-servico?tipo=S" },
  { key: "os-p", label: "Faturamento de Produtos da OS", kind: "P", cat: "Receita de Instalação (Projetos Novos)", extra: "Use a tela Faturamento de Ordem de Serviço.", href: "/faturamento/ordem-servico?tipo=P" },
  { key: "servicos", label: "Faturamento de Serviços", kind: "S", cat: "Receita de Contratos de Manutenção", extra: "Serviços avulsos, sem OS." },
  { key: "contratos", label: "Faturamento de Contratos", kind: "S", cat: "Receita de Contratos de Manutenção", extra: "Use a tela Faturamento de Contratos.", href: "/faturamento/contratos" },
];
type Item = { description: string; quantity: string; unitValue: string; discount: string };
const n = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

function NewInvoice() {
  const router = useRouter();
  const initial = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tipo") : null;
  const [op, setOp] = useState(OPS.find((o) => o.key === initial) ?? OPS[0]);
  const [step, setStep] = useState(0);
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: "1", unitValue: "0,00", discount: "0,00" }]);
  const [comp, setComp] = useState(isoDay(new Date()).slice(5, 7) + "/" + isoDay(new Date()).slice(2, 4));
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = items.reduce((s, i) => s + Math.max(0, n(i.quantity) * n(i.unitValue) - n(i.discount)), 0);
  const upd = (k: number, p: Partial<Item>) => setItems((l) => l.map((x, i) => (i === k ? { ...x, ...p } : x)));
  const steps = ["Dados Gerais", "Itens", "Financeiro"];

  async function save() {
    setError(""); setBusy(true);
    try {
      const r = await billing.createInvoice({ kind: op.kind, personId: client?.id, competence: comp, description: desc, items: items.map((i) => ({ description: i.description, quantity: n(i.quantity), unitValue: n(i.unitValue), discount: n(i.discount) })) });
      router.push(`/faturamento/central/${r.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível gerar a fatura."); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Faturamento de Produtos" }]} />
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-ds-primary-deep">Faturamento de Produtos</h1>
      <div className={card}>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ds-border-subtle px-5 py-3"><span className="flex items-center gap-2 font-bold text-ds-primary-deep"><Icon name="rocket_launch" className="text-[22px] text-[#F7941D]" />Nova Fatura</span><span className="text-right text-xs text-ds-text-secondary">Total da Fatura <b className="ml-1 text-sm text-ds-primary-deep">{money(total)}</b></span></header>
        <div className="grid md:grid-cols-[180px_1fr]">
          <ol className="flex gap-1 border-b border-ds-border-subtle p-2 md:block md:border-b-0 md:border-r">{steps.map((s, i) => <li key={s}><button type="button" disabled={i > step} onClick={() => setStep(i)} className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${step === i ? "bg-ds-bg text-ds-primary-deep" : "text-ds-text-muted disabled:opacity-40"}`}>{s}</button></li>)}</ol>
          <div className="p-5">
            {step === 0 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div><h2 className="mb-3 font-bold text-ds-primary-deep">Qual tipo de operação deseja realizar?</h2><ul className="overflow-hidden rounded-xl border border-ds-border-subtle">{OPS.map((o) => <li key={o.key} className="border-b border-ds-border-subtle last:border-0"><label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-ds-bg"><input type="radio" name="op" checked={op.key === o.key} onChange={() => setOp(o)} className="h-4 w-4 accent-[#F7941D]" />{o.label}</label></li>)}</ul></div>
                <dl className="space-y-2 text-sm"><dt className="font-bold text-ds-primary-deep">{op.label}</dt><dd className="text-xs text-ds-text-secondary">Categoria</dd><dd className="font-semibold">{op.cat}</dd><dd className="text-ds-text-muted">{op.extra}</dd></dl>
              </div>
            )}
            {step === 1 && (
              <div>
                <div className="mb-4 grid gap-3 sm:grid-cols-2"><div><span className={label}>Cliente *</span><ClientPicker value={client} onChange={(c) => setClient(c ? { id: c.id, name: c.name } : null)} /></div><label><span className={label}>Competência (MM/AA)</span><input value={comp} onChange={(e) => setComp(e.target.value)} maxLength={5} className={field} /></label></div>
                <ul className="space-y-2">{items.map((it, k) => <li key={k} className="grid gap-2 rounded-xl border border-ds-border-subtle p-3 sm:grid-cols-[1fr_90px_120px_110px_auto]"><input value={it.description} onChange={(e) => upd(k, { description: e.target.value })} placeholder={op.kind === "P" ? "Produto" : "Serviço"} className={field} /><input inputMode="decimal" value={it.quantity} onChange={(e) => upd(k, { quantity: e.target.value })} aria-label="Quantidade" className={field} /><input inputMode="decimal" value={it.unitValue} onChange={(e) => upd(k, { unitValue: e.target.value })} aria-label="Valor unitário" className={field} /><input inputMode="decimal" value={it.discount} onChange={(e) => upd(k, { discount: e.target.value })} aria-label="Desconto" className={field} /><button type="button" disabled={items.length === 1} onClick={() => setItems((l) => l.filter((_, i) => i !== k))} aria-label="Remover item" className="text-ds-danger-text disabled:opacity-30"><Icon name="delete" className="text-[20px]" /></button></li>)}</ul>
                <button type="button" onClick={() => setItems((l) => [...l, { description: "", quantity: "1", unitValue: "0,00", discount: "0,00" }])} className="mt-3 text-sm font-bold text-ds-primary hover:underline">+ Adicionar item</button>
              </div>
            )}
            {step === 2 && (
              <div className="grid gap-4"><label><span className={label}>Observação da nota</span><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={500} className="w-full resize-y rounded-[10px] border border-ds-border px-3 py-2 text-sm outline-none focus:border-ds-primary" /></label><p className="text-sm text-ds-text-muted">Será gerado 1 título de <b className="text-ds-primary-deep">{money(total)}</b> para {client?.name ?? "o cliente"}.</p></div>
            )}
            {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
            <div className="mt-6 flex gap-2">
              {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className={btnGhost}>Voltar</button>}
              {step === 0 && <button type="button" onClick={() => (op.href ? router.push(op.href) : setStep(1))} className={btnPrimary}>Continuar →</button>}
              {step === 1 && <button type="button" onClick={() => setStep(2)} className={btnPrimary}>Continuar →</button>}
              {step === 2 && <button type="button" disabled={busy} onClick={() => void save()} className={btnPrimary}>{busy ? "Gerando..." : "Gerar fatura"}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsBillingPage() { return <PageShell permissionKey={FAT_KEYS.produtos}>{() => <NewInvoice />}</PageShell>; }
