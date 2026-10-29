"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Modal, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { money } from "@/lib/cadastros";
import { FAT_KEYS, ORIGIN_LABEL, billing, dateBr, download, pad, type Invoice, type Lot, type NfeRow, type NfseRow } from "@/lib/faturamento";

type Tab = "S" | "P" | "R" | "N" | "L";
const TABS: { key: Tab; label: string }[] = [{ key: "S", label: "Faturas de Serviços" }, { key: "P", label: "Faturas de Produtos" }, { key: "R", label: "NFS-e" }, { key: "N", label: "NF-e" }, { key: "L", label: "Recibo de Locação" }];
const SORTS: Record<Tab, { key: string; label: string }[]> = {
  S: [{ key: "number", label: "Número da Fatura" }, { key: "date", label: "Data de registro" }, { key: "total", label: "Valor" }, { key: "client", label: "Cliente" }],
  P: [{ key: "number", label: "Número da Fatura" }, { key: "date", label: "Data de registro" }, { key: "total", label: "Valor" }, { key: "client", label: "Cliente" }],
  R: [{ key: "date", label: "Data de emissão RPS" }, { key: "total", label: "Valor" }, { key: "client", label: "Cliente" }],
  N: [{ key: "date", label: "Data de emissão Nota" }, { key: "client", label: "Cliente" }],
  L: [],
};
const chip = "inline-flex items-center gap-1 text-xs text-ds-text-muted";

function RowMenu({ inv, onChanged }: { inv: Invoice; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [desc, setDesc] = useState(inv.description ?? "");
  const [comp, setComp] = useState(inv.competence);
  const [error, setError] = useState("");
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ds-text hover:bg-ds-bg";
  const canceled = inv.status === "CANCELADA";
  return (
    <div ref={box} className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`Ações da fatura ${inv.number}`} aria-expanded={open} className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ds-primary hover:bg-ds-bg"><Icon name="arrow_drop_down" className="text-[22px]" /></button>
      {open && (
        <div role="menu" className="absolute left-0 top-7 z-20 w-48 overflow-hidden rounded-xl border border-ds-border-subtle bg-white py-1 shadow-xl">
          <button role="menuitem" type="button" className={item} onClick={() => router.push(`/faturamento/central/${inv.id}`)}><Icon name="receipt_long" className="text-[18px] text-ds-primary" />Ver Resumo</button>
          <button role="menuitem" type="button" className={item} onClick={() => router.push(`/faturamento/central/${inv.id}?imprimir=1`)}><Icon name="print" className="text-[18px] text-ds-primary" />Visualizar Fatura</button>
          <a role="menuitem" className={item} href={`mailto:?subject=${encodeURIComponent(`Fatura ${pad(inv.number)} - Teclive`)}&body=${encodeURIComponent(`Fatura ${pad(inv.number)} - ${inv.personName}\nCompetência ${inv.competence}\nValor ${money(inv.total)}`)}`}><Icon name="mail" className="text-[18px] text-ds-primary" />Enviar por E-mail</a>
          {!canceled && <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); setEdit(true); }}><Icon name="edit" className="text-[18px] text-ds-primary" />Editar</button>}
          {!canceled && <button role="menuitem" type="button" className={`${item} text-ds-danger-text`} onClick={() => { setOpen(false); if (confirm(`Cancelar a fatura ${pad(inv.number)}?`)) void billing.cancelInvoice(inv.id).then(onChanged).catch((e) => alert(e instanceof Error ? e.message : "Não foi possível cancelar.")); }}><Icon name="block" className="text-[18px]" />Cancelar</button>}
        </div>
      )}
      {edit && (
        <Modal title={`Editar fatura ${pad(inv.number)}`} onClose={() => setEdit(false)}>
          <div className="grid gap-4">
            <label><span className={label}>Competência (MM/AA)</span><input value={comp} onChange={(e) => setComp(e.target.value)} maxLength={5} className={field} /></label>
            <label><span className={label}>Descrição</span><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={500} className="w-full resize-y rounded-[10px] border border-ds-border px-3 py-2 text-sm outline-none focus:border-ds-primary" /></label>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
          <div className="mt-4 flex gap-2"><button type="button" className={btnPrimary} onClick={() => void billing.editInvoice(inv.id, { competence: comp, description: desc }).then(() => { setEdit(false); onChanged(); }).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível salvar."))}>Salvar</button><button type="button" className={btnGhost} onClick={() => setEdit(false)}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}

function InvoiceCard({ inv, sel, onSel, onChanged }: { inv: Invoice; sel: boolean; onSel: () => void; onChanged: () => void }) {
  const canceled = inv.status === "CANCELADA";
  return (
    <li className={`flex items-start gap-3 border-b border-ds-border-subtle px-4 py-4 last:border-0 ${canceled ? "bg-ds-bg/60" : ""}`}>
      <input type="checkbox" checked={sel} onChange={onSel} aria-label={`Selecionar fatura ${inv.number}`} className="mt-1 h-4 w-4 accent-[#005CD2]" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1 text-[15px] font-bold text-ds-primary-deep"><Link href={`/faturamento/central/${inv.id}`} className="hover:underline">#{inv.number} - {inv.personName}</Link><RowMenu inv={inv} onChanged={onChanged} />{canceled && <span className="rounded-full bg-[#FDE6E4] px-2 py-0.5 text-[11px] font-bold text-[#B42318]">Cancelada</span>}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className={chip}><Icon name="calendar_month" className="text-[15px]" />Competência: {inv.competence}</span>
          {inv.origin === "OS" && <span className={chip}><Icon name="build" className="text-[15px]" />Ordem de Serviço: <b className="text-ds-primary-deep">#{inv.originRef}</b></span>}
          {inv.origin === "CONTRATO" && <span className={chip}><Icon name="description" className="text-[15px]" />Contrato: <b className="text-ds-primary-deep">{inv.originRef}</b></span>}
          <span className={chip}><Icon name={inv.kind === "P" ? "inventory_2" : "construction"} className="text-[15px]" />Fatura de {inv.kind === "P" ? "Produtos" : "Serviços"}</span>
          {inv.nfseNumber && <span className={chip}><Icon name="draft" className="text-[15px]" />NFS-e: <b className="text-ds-primary-deep">{inv.nfseNumber}</b></span>}
          {inv.nfeNumber && <span className={chip}><Icon name="draft" className="text-[15px]" />NF-e: <b className="text-ds-primary-deep">{inv.nfeNumber}</b></span>}
          <span className={chip}><Icon name="person" className="text-[15px]" />Criado por: {inv.createdBy}</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-ds-text-muted"><span className={chip}><Icon name="event" className="text-[15px]" />Registro: {dateBr(inv.registeredAt)}</span>{inv.titleGenerated && <span className={chip}><Icon name="receipt" className="text-[15px]" />Título: <b className="text-ds-primary-deep">1 título gerado</b></span>}</p>
      </div>
      <div className="shrink-0 text-right"><p className="text-lg font-bold text-ds-primary-deep">{money(inv.total)}</p><span className="mt-1 inline-block rounded-full border border-ds-border px-3 py-1 text-[11px] font-semibold text-ds-text-muted">{ORIGIN_LABEL[inv.origin]}</span></div>
    </li>
  );
}

function NfseCard({ r }: { r: NfseRow }) {
  return (
    <li className="flex items-start gap-3 border-b border-ds-border-subtle px-4 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-ds-primary-deep">#{r.rps} - {r.personName}</p>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1"><span className={chip}>Emissão: {dateBr(r.issuedAt)}</span><span className={chip}>RPS: #{r.rps}</span><span className={chip}>Fatura: {r.invoiceId ? <Link href={`/faturamento/central/${r.invoiceId}`} className="font-bold text-ds-primary hover:underline">#{r.invoiceNumber}</Link> : `#${r.invoiceNumber}`}</span><span className={chip}>Lote: #{r.lote}</span><span className={chip}>NFS-e: <b className="text-ds-primary-deep">{r.nfseNumber}</b></span><span className={chip}>Emissão NFS-e: {dateBr(r.issuedAt)}</span></p>
      </div>
      <div className="shrink-0 text-right"><p className="text-lg font-bold text-ds-primary-deep">{money(r.total)}</p><span className={`mt-1 inline-block rounded-full px-3 py-1 text-[11px] font-bold ${r.status === "G" ? "bg-[#DDF6EA] text-[#0B7A4B]" : "bg-[#FDE6E4] text-[#B42318]"}`}>{r.status === "G" ? "NFSe Gerada" : "NFS-e Cancelada"}</span></div>
    </li>
  );
}

function NfeCard({ r }: { r: NfeRow }) {
  const st = r.status === "A" ? { t: "Autorizado o uso da NF-e", c: "text-[#0B7A4B]" } : r.status === "D" ? { t: "Autorizado o uso da NF-e (devolução)", c: "text-[#0B7A4B]" } : { t: "NF-e Cancelada", c: "text-[#B42318]" };
  return (
    <li className="border-b border-ds-border-subtle px-4 py-4 last:border-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ds-primary-deep">#{r.number} - {r.personName}</p>
          <p className={`mt-0.5 text-xs font-bold ${st.c}`}>{st.t}</p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1"><span className={chip}>Emissão: {dateBr(r.issuedAt)}</span><span className={chip}>{r.kindLabel}</span>{r.invoiceNumber && <span className={chip}>Fatura: {r.invoiceId ? <Link href={`/faturamento/central/${r.invoiceId}`} className="font-bold text-ds-primary hover:underline">#{r.invoiceNumber}</Link> : `#${r.invoiceNumber}`}</span>}{r.exitDate && <span className={chip}>Saída NF-e: {dateBr(r.exitDate)}</span>}</p>
          <p className="mt-1 break-all font-mono text-[11px] text-ds-text-secondary">Chave de acesso: {r.accessKey}</p>
        </div>
        {r.total !== null && <p className="shrink-0 text-lg font-bold text-ds-primary-deep">{money(r.total)}</p>}
      </div>
    </li>
  );
}

function Central() {
  const [tab, setTab] = useState<Tab>("S");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [adv, setAdv] = useState(false);
  const [sort, setSort] = useState("number");
  const [desc, setDesc] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ lista: unknown[]; total: number; hasMore: boolean } | null>(null);
  const [error, setError] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [lots, setLots] = useState<Lot[] | null>(null);
  const [xmlOpen, setXmlOpen] = useState(false);
  const [xmlType, setXmlType] = useState<"nfse" | "nfe">("nfse");

  const load = useCallback(() => {
    if (tab === "L") { setData({ lista: [], total: 0, hasMore: false }); return Promise.resolve(); }
    const p = { q: term, from, to, sort, desc, page };
    const run = tab === "S" || tab === "P" ? billing.invoices({ ...p, kind: tab, status, origin }) : tab === "R" ? billing.nfse(p) : billing.nfe(p);
    return run.then((d) => { setData(d as never); setError(""); }).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar."));
  }, [tab, term, from, to, sort, desc, page, status, origin]);
  useEffect(() => { void load(); }, [load]);

  const changeTab = (t: Tab) => { setTab(t); setPage(1); setSort(SORTS[t][0]?.key ?? "number"); setDesc(true); setSel(new Set()); setData(null); };
  const reset = () => { setQ(""); setTerm(""); setFrom(""); setTo(""); setStatus(""); setOrigin(""); setPage(1); };
  const rows = (data?.lista ?? []) as never[];

  function exportSel() {
    const list = (rows as Invoice[]).filter((i) => sel.has(i.id));
    const csv = `﻿Fatura;Cliente;Competência;Origem;Registro;Valor;Situação\n${list.map((i) => [pad(i.number), i.personName, i.competence, ORIGIN_LABEL[i.origin], dateBr(i.registeredAt), i.total.toFixed(2).replace(".", ","), i.status === "CANCELADA" ? "Cancelada" : "Faturada"].join(";")).join("\n")}`;
    download("faturas.csv", csv, "text/csv;charset=utf-8");
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Central de Faturamento" }]} />
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-ds-primary-deep">Central de Faturamento</h1>

      <div className="mb-0 flex flex-wrap items-end justify-between gap-2">
        <nav role="tablist" className="flex flex-wrap gap-1">
          {TABS.map((t) => <button key={t.key} role="tab" aria-selected={tab === t.key} type="button" onClick={() => changeTab(t.key)} className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold ${tab === t.key ? "border-ds-border-subtle border-t-[3px] border-t-[#F7941D] bg-white text-ds-primary-deep" : "border-transparent text-ds-text-muted hover:text-ds-primary"}`}>{t.label}</button>)}
          <button type="button" onClick={() => setXmlOpen(true)} className="rounded-t-lg border border-transparent px-4 py-2 text-sm font-semibold text-ds-text-muted hover:text-ds-primary">Exportar XML</button>
        </nav>
        <button type="button" onClick={() => void billing.processing().then(setLots).catch(() => setLots([]))} className={`${btnGhost} mb-1`}><Icon name="sync" className="mr-1.5 text-[18px]" />Processamentos</button>
      </div>

      <div className={`${card} rounded-tl-none`}>
        {tab !== "L" && (
          <div className="border-b border-ds-border-subtle p-3">
            <form onSubmit={(e) => { e.preventDefault(); setTerm(q); setPage(1); }} className="flex flex-wrap items-center gap-2">
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="Data inicial" className={`${field} w-40`} />
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="Data final" className={`${field} w-40`} />
              <div className="relative min-w-[220px] flex-1"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ds-text-secondary" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome do cliente, Nº da fatura, data de competência..." className={`${field} pl-10`} /></div>
              <button type="submit" className={btnPrimary}>Buscar</button>
              {(tab === "S" || tab === "P") && <button type="button" onClick={() => setAdv((v) => !v)} aria-expanded={adv} className="inline-flex h-10 items-center gap-1 text-sm font-bold text-ds-primary"><Icon name="filter_alt" className="text-[18px]" />Filtros avançados</button>}
              <button type="button" onClick={reset} className={btnGhost}>Limpar</button>
            </form>
            {adv && (tab === "S" || tab === "P") && (
              <div className="mt-3 flex flex-wrap gap-3">
                <label className="text-xs font-bold text-ds-text-secondary">Situação<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`${field} mt-1 w-44`}><option value="">Todas</option><option value="FATURADA">Faturada</option><option value="CANCELADA">Cancelada</option></select></label>
                <label className="text-xs font-bold text-ds-text-secondary">Origem<select value={origin} onChange={(e) => { setOrigin(e.target.value); setPage(1); }} className={`${field} mt-1 w-56`}><option value="">Todas</option><option value="OS">Ordem de serviço</option><option value="CONTRATO">Contrato</option><option value="AVULSA">Avulsa</option></select></label>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-xs text-ds-text-secondary">{sel.size > 0 ? <button type="button" onClick={exportSel} className="font-bold text-ds-primary hover:underline">Exportar {sel.size} selecionada(s) (CSV)</button> : data ? `${data.total} ${data.total === 1 ? "registro" : "registros"}` : ""}</span>
              <label className="flex items-center gap-2 text-ds-text-muted">Ordenar por:
                <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="rounded-lg border border-ds-border bg-white px-2 py-1 font-bold text-ds-primary-deep">{SORTS[tab].map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
                <button type="button" onClick={() => setDesc((d) => !d)} aria-label="Inverter ordem" className="text-ds-primary"><Icon name={desc ? "arrow_downward" : "arrow_upward"} className="text-[18px]" /></button>
              </label>
            </div>
          </div>
        )}

        {error && <p role="alert" className="m-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
        {tab === "L" ? <p className="px-6 py-14 text-center text-ds-text-secondary">Nenhum Recibo de locação encontrado para os filtros providos.</p>
          : !data ? <p className="px-6 py-14 text-center text-ds-text-secondary">Carregando...</p>
          : rows.length === 0 ? <p className="px-6 py-14 text-center text-ds-text-secondary">Nenhum registro encontrado para os filtros providos.</p>
          : <ul>{rows.map((r) => tab === "S" || tab === "P" ? <InvoiceCard key={(r as Invoice).id} inv={r as Invoice} sel={sel.has((r as Invoice).id)} onSel={() => setSel((s) => { const n = new Set(s); const id = (r as Invoice).id; if (n.has(id)) n.delete(id); else n.add(id); return n; })} onChanged={() => void load()} /> : tab === "R" ? <NfseCard key={(r as NfseRow).rps} r={r as NfseRow} /> : <NfeCard key={(r as NfeRow).number} r={r as NfeRow} />)}</ul>}
        {data?.hasMore && <div className="border-t border-ds-border-subtle p-3 text-center"><button type="button" onClick={() => setPage((p) => p + 1)} className="text-sm font-bold text-ds-primary hover:underline">Carregar mais</button></div>}
      </div>

      {lots && (
        <Modal title="Processamentos" onClose={() => setLots(null)}>
          <p className="mb-3 text-xs text-ds-text-secondary">Lotes de NFS-e enviados para processamento.</p>
          <table className="w-full text-left text-sm"><thead className="text-xs text-ds-text-secondary"><tr><th className="py-2 font-bold">Lote</th><th className="py-2 font-bold">Data</th><th className="py-2 text-center font-bold">Notas</th><th className="py-2 text-right font-bold">Valor</th><th className="py-2 text-center font-bold">Situação</th></tr></thead>
            <tbody>{lots.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-ds-text-secondary">Nenhum processamento.</td></tr>}{lots.map((l) => <tr key={l.lote} className="border-t border-ds-border-subtle"><td className="py-2 font-bold text-ds-primary-deep">#{l.lote}</td><td className="py-2 text-ds-text-muted">{dateBr(l.issuedAt)}</td><td className="py-2 text-center">{l.count}</td><td className="py-2 text-right font-semibold">{money(l.total)}</td><td className="py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${l.cancelled ? "bg-[#FDE6E4] text-[#B42318]" : "bg-[#DDF6EA] text-[#0B7A4B]"}`}>{l.cancelled ? "Com cancelamento" : "Concluído"}</span></td></tr>)}</tbody></table>
        </Modal>
      )}
      {xmlOpen && (
        <Modal title="Exportar XML" onClose={() => setXmlOpen(false)}>
          <div className="grid gap-4">
            <label><span className={label}>Tipo de nota</span><select value={xmlType} onChange={(e) => setXmlType(e.target.value as "nfse" | "nfe")} className={field}><option value="nfse">NFS-e (serviços)</option><option value="nfe">NF-e (produtos)</option></select></label>
            <div className="grid grid-cols-2 gap-3"><label><span className={label}>Data inicial</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} /></label><label><span className={label}>Data final</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} /></label></div>
          </div>
          <div className="mt-4 flex gap-2"><button type="button" className={btnPrimary} onClick={() => void billing.exportXml(xmlType, from, to).then((x) => { download(`${xmlType}.xml`, x, "application/xml"); setXmlOpen(false); }).catch((e) => alert(e instanceof Error ? e.message : "Falha ao exportar."))}>Exportar</button><button type="button" className={btnGhost} onClick={() => setXmlOpen(false)}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}

export default function CentralPage() { return <PageShell permissionKey={FAT_KEYS.central}>{() => <Central />}</PageShell>; }
