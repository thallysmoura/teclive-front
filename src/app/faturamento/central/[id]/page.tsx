"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { card } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { formatDocument, money } from "@/lib/cadastros";
import { FAT_KEYS, billing, dateBr, download, pad, type InvoiceDetail } from "@/lib/faturamento";

const dt = "text-[11px] font-bold uppercase tracking-wide text-ds-text-secondary";
const dd = "mt-0.5 text-sm font-semibold text-ds-primary-deep";
const Field = ({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) => <div className={span ? "sm:col-span-3" : ""}><p className={dt}>{label}</p><p className={dd}>{children || "-"}</p></div>;

function Menu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={box} className="relative print:hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex h-9 items-center gap-1 rounded-lg border border-ds-border bg-white px-3 text-sm font-semibold text-ds-primary-deep hover:border-ds-primary">{label}<Icon name="arrow_drop_down" className="text-[20px]" /></button>
      {open && <div role="menu" onClick={() => setOpen(false)} className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-xl border border-ds-border-subtle bg-white py-1 shadow-xl">{children}</div>}
    </div>
  );
}
const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ds-text hover:bg-ds-bg";

function Summary({ id }: { id: string }) {
  const router = useRouter();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void billing.invoice(id).then(setInv).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar a fatura.")); }, [id]);
  useEffect(() => { if (inv && new URLSearchParams(window.location.search).has("imprimir")) setTimeout(() => window.print(), 400); }, [inv]);

  if (error) return <p role="alert" className="mx-auto max-w-3xl rounded-lg bg-ds-danger-bg px-4 py-3 text-ds-danger-text">{error}</p>;
  if (!inv) return <p className="py-16 text-center text-ds-text-secondary">Carregando...</p>;
  const canceled = inv.status === "CANCELADA";
  const nf = inv.nfse[0], ne = inv.nfe[0];
  const cancel = () => { if (confirm(`Cancelar a fatura ${pad(inv.number)}?`)) void billing.cancelInvoice(inv.id).then(() => billing.invoice(id).then(setInv)).catch((e) => alert(e instanceof Error ? e.message : "Não foi possível cancelar.")); };
  const items = inv.origin === "OS" && inv.order ? [{ n: inv.kind === "P" ? "Produtos da OS" : "Serviços da OS", q: 1, v: inv.total }] : inv.origin === "CONTRATO" && inv.contract ? [{ n: `Mensalidade do contrato ${inv.contract.number}`, q: 1, v: inv.total }] : [{ n: inv.description ?? "Item avulso", q: 1, v: inv.total }];

  return (
    <div className="mx-auto max-w-[1000px]">
      <style>{`
        @page { size: A4; margin: 14mm 12mm; }
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #fatura-print, #fatura-print * { visibility: visible !important; }
          div.flex.min-h-screen > *:not(main) { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          html, body { height: auto !important; overflow: visible !important; }
          #fatura-print { position: static !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; border-radius: 0 !important; font-size: 11.5px; color: #111; }
          #fatura-print section { break-inside: avoid; }
          #fatura-print table { font-size: 11px; }
          #fatura-print .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          #fatura-print .sm\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          #fatura-print .sm\\:col-span-3 { grid-column: span 3 / span 3 !important; }
          #fatura-print .sm\\:col-span-4 { grid-column: span 4 / span 4 !important; }
        }
      `}</style>
      <div className="print:hidden"><Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Central de Faturamento", href: "/faturamento/central" }, { label: "Resumo do Faturamento" }]} /></div>
      <div id="fatura-print" className={`${card} p-6 md:p-8`}>
        <div className="mb-4 hidden items-center justify-between border-b-2 border-[#00406A] pb-3 print:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/teclive-logo.png" alt="Teclive" className="h-12 w-auto" />
          <div className="text-right text-[11px] leading-tight text-[#334155]"><p className="text-sm font-extrabold text-[#00406A]">Teclive Serviços em Tecnologia</p><p>Fatura nº {pad(inv.number)} · emitida em {dateBr(inv.registeredAt)}</p><p>Competência {inv.competence}</p></div>
        </div>
        <header className="flex flex-wrap items-center gap-3 border-b border-dashed border-ds-border pb-4 print:border-solid print:border-[#CBD5E1]">
          <h1 className="text-2xl font-extrabold text-ds-primary-deep">Fatura de {inv.kind === "P" ? "Produtos" : "Serviços"}</h1>
          <span className="rounded-md bg-ds-bg px-2 py-0.5 text-sm font-bold text-ds-text-muted">{pad(inv.number)}</span>
          <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${canceled ? "bg-[#FDE6E4] text-[#B42318]" : "bg-[#DDF6EA] text-[#0B7A4B]"}`}>{canceled ? "Cancelada" : "Faturada"}</span>
          <div className="ml-auto flex gap-2">
            <Menu label="Opções">
              <button role="menuitem" type="button" className={item} onClick={() => window.print()}><Icon name="print" className="text-[18px] text-ds-primary" />Imprimir fatura</button>
              <a role="menuitem" className={item} href={`mailto:${inv.person?.email ?? ""}?subject=${encodeURIComponent(`Fatura ${pad(inv.number)} - Teclive`)}&body=${encodeURIComponent(`Fatura ${pad(inv.number)}\nCompetência ${inv.competence}\nValor ${money(inv.total)}`)}`}><Icon name="mail" className="text-[18px] text-ds-primary" />Enviar por E-mail</a>
              {!canceled && <button role="menuitem" type="button" className={`${item} text-ds-danger-text`} onClick={cancel}><Icon name="block" className="text-[18px]" />Cancelar fatura</button>}
            </Menu>
            <Menu label="Ações da NFSe">
              <button role="menuitem" type="button" disabled={!nf} className={`${item} disabled:opacity-40`} onClick={() => nf && download(`nfse-${nf.nfseNumber}.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<nfse numero="${nf.nfseNumber}" rps="${nf.rps}" lote="${nf.lote}" emissao="${nf.issuedAt.slice(0, 10)}" valor="${nf.total.toFixed(2)}"/>\n`, "application/xml")}><Icon name="download" className="text-[18px] text-ds-primary" />Baixar XML da NFS-e</button>
              <button role="menuitem" type="button" disabled={!ne} className={`${item} disabled:opacity-40`} onClick={() => ne && download(`nfe-${ne.number}.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<nfe numero="${ne.number}" chaveAcesso="${ne.accessKey}" emissao="${ne.issuedAt.slice(0, 10)}"/>\n`, "application/xml")}><Icon name="download" className="text-[18px] text-ds-primary" />Baixar XML da NF-e</button>
            </Menu>
          </div>
        </header>

        <section className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-3">
          <Field label="Cliente">{inv.person ? <Link href="/cadastros/pessoas" className="hover:underline">{inv.person.name}</Link> : inv.personName}</Field>
          <Field label="CNPJ / CPF">{inv.person?.document ? formatDocument(inv.person.document) : ""}</Field>
          <Field label="Data Emissão">{dateBr(inv.registeredAt)}</Field>
          <Field label="Endereço da Fatura">{inv.person?.address ?? inv.order?.address}</Field>
          <Field label="E-mail">{inv.person?.email}</Field>
          <Field label="Fone">{inv.person?.phone}</Field>
          <Field label="Operação de Faturamento">{inv.operation}</Field>
          <Field label="Vendedor">{inv.seller}</Field>
          <Field label="Competência">{inv.competence}</Field>
          <Field label="Descrição dos Serviços" span>{inv.description ?? inv.order?.defect}</Field>
          {inv.order && <Field label="Informações Complementares da Nota" span>{`Fatura referente a Ordem de Serviço Nº ${inv.order.number}`}</Field>}
        </section>

        {(nf || ne) && (
          <section className="mt-6 border-t border-ds-border-subtle pt-5">
            <h2 className="mb-3 text-lg font-bold text-ds-primary-deep">Nota Fiscal</h2>
            {nf && <div className="grid gap-x-8 gap-y-4 sm:grid-cols-4"><Field label="RPS">{`${nf.rps} / 1`}</Field><Field label="Lote">{nf.lote}</Field><Field label="NFS-e">{nf.nfseNumber}</Field><Field label="Emissão da NFS-e">{dateBr(nf.issuedAt)}</Field><Field label="Status">{nf.status === "G" ? "NFS-e emitida" : "NFS-e cancelada"}</Field></div>}
            {ne && <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-4"><Field label="NF-e">{ne.number}</Field><Field label="Emissão">{dateBr(ne.issuedAt)}</Field><Field label="Saída">{dateBr(ne.exitDate)}</Field><Field label="Status">{ne.status === "C" ? "NF-e cancelada" : "Autorizado o uso da NF-e"}</Field><div className="sm:col-span-4"><p className={dt}>Chave de acesso</p><p className="mt-0.5 break-all font-mono text-xs text-ds-primary-deep">{ne.accessKey}</p></div></div>}
          </section>
        )}

        <section className="mt-6 border-t border-ds-border-subtle pt-5">
          <h2 className="mb-3 text-lg font-bold text-ds-primary-deep">{inv.kind === "P" ? "Produtos" : "Serviços"}</h2>
          <div className="overflow-x-auto rounded-xl border border-ds-border-subtle"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-ds-bg/60 text-xs text-ds-text-secondary"><tr><th className="px-4 py-2.5 font-bold">{inv.kind === "P" ? "Produto" : "Serviço"}</th><th className="px-4 py-2.5 text-right font-bold">Quantidade</th><th className="px-4 py-2.5 text-right font-bold">Valor Unitário</th><th className="px-4 py-2.5 text-right font-bold">Total Bruto</th></tr></thead>
            <tbody>{items.map((i, k) => <tr key={k} className="border-t border-ds-border-subtle"><td className="px-4 py-2.5">{k === 0 && <span className="mr-2 rounded bg-[#F7941D]/20 px-1.5 text-[10px] font-bold text-[#B45309]">Principal</span>}{i.n}</td><td className="px-4 py-2.5 text-right">{i.q.toFixed(2).replace(".", ",")}</td><td className="px-4 py-2.5 text-right">{money(i.v)}</td><td className="px-4 py-2.5 text-right">{money(i.v)}</td></tr>)}</tbody></table></div>
          <dl className="ml-auto mt-3 grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm"><dt className="text-ds-text-secondary">Valor Total Bruto</dt><dd className="text-right">{money(inv.total)}</dd><dt className="text-ds-text-secondary">Descontos</dt><dd className="text-right">- {money(0)}</dd><dt className="text-base font-bold text-ds-primary-deep">Valor Total Líquido</dt><dd className="text-right text-base font-bold text-ds-primary-deep">{money(inv.total)}</dd></dl>
        </section>

        {inv.titleGenerated && !canceled && (
          <section className="mt-6 border-t border-ds-border-subtle pt-5">
            <h2 className="mb-3 text-lg font-bold text-ds-primary-deep">Financeiro</h2>
            <div className="overflow-x-auto rounded-xl border border-ds-border-subtle"><table className="w-full text-left text-sm"><thead className="bg-ds-bg/60 text-xs text-ds-text-secondary"><tr><th className="px-4 py-2.5 font-bold">Parcela</th><th className="px-4 py-2.5 font-bold">Forma de Pagamento</th><th className="px-4 py-2.5 font-bold">Status</th><th className="px-4 py-2.5 text-right font-bold">Valor</th></tr></thead><tbody><tr className="border-t border-ds-border-subtle"><td className="px-4 py-2.5">1/1</td><td className="px-4 py-2.5">Boleto</td><td className="px-4 py-2.5">Não Recebida</td><td className="px-4 py-2.5 text-right">{money(inv.total)}</td></tr></tbody></table></div>
            <p className="mt-2 text-xs text-ds-text-secondary">1 título gerado · Total gerado {money(inv.total)} · A receber {money(inv.total)}</p>
          </section>
        )}

        {inv.order && (
          <section className="mt-6 border-t border-ds-border-subtle pt-5">
            <h2 className="mb-3 text-lg font-bold text-ds-primary-deep">Dados da Ordem de Serviço</h2>
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-4"><Field label="Ordem de Serviço"><Link href={`/operacional/ordens-servico?os=${inv.order.id}`} className="hover:underline">{pad(inv.order.number)}</Link></Field><Field label="Data de Fechamento">{dateBr(inv.order.closedAt)}</Field><Field label="Valor dos Serviços">{money(inv.order.services)}</Field><Field label="Valor dos Produtos">{money(inv.order.products)}</Field><Field label="Valor Total Líquido">{money(inv.order.services + inv.order.products)}</Field></div>
          </section>
        )}
        {inv.contract && (
          <section className="mt-6 border-t border-ds-border-subtle pt-5">
            <h2 className="mb-3 text-lg font-bold text-ds-primary-deep">Dados do Contrato</h2>
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-4"><Field label="Contrato"><Link href={`/contratos/${inv.contract.id}`} className="hover:underline">{inv.contract.number}</Link></Field><Field label="Dia de vencimento">{`${String(inv.contract.billingDay).padStart(2, "0")}º dia`}</Field><Field label="Valor mensal">{money(inv.contract.totalNet)}</Field></div>
          </section>
        )}
        <div className="mt-6 print:hidden"><button type="button" onClick={() => router.push("/faturamento/central")} className="text-sm font-bold text-ds-primary hover:underline">Voltar à Central de Faturamento</button></div>
      </div>
    </div>
  );
}

export default function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PageShell permissionKey={FAT_KEYS.central}>{() => <Summary id={id} />}</PageShell>;
}
