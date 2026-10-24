"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/lib/cadastros";
import { COMERCIAL_KEYS, QUOTE_STATUS, QUOTE_STATUS_OPTIONS, formatQuoteNumber, quotesClient, type QuoteRow } from "@/lib/comercial";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { QuoteInsights } from "@/components/comercial/quote-insights";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SortButton } from "@/components/ui/sortable";

type Filters = { status: string; modality: string; personType: string; seller: string; reason: string; hideCancelled: boolean };
const NONE: Filters = { status: "", modality: "", personType: "", seller: "", reason: "", hideCancelled: false };
const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary";
const EDITABLE = [3, 6];

export default function QuotesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [filters, setFilters] = useState<Filters>(NONE);
  const [draft, setDraft] = useState<Filters>(NONE);
  const [panel, setPanel] = useState(false);
  const [options, setOptions] = useState<{ sellers: string[]; reasons: string[] }>({ sellers: [], reasons: [] });
  const [orderBy, setOrderBy] = useState("number");
  const [desc, setDesc] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState<{ row: QuoteRow; top: number; right: number } | null>(null);
  const [cancelling, setCancelling] = useState<QuoteRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    return quotesClient.list({ q, from, until, ...filters, page, orderBy, desc })
      .then((r) => { setRows(r.lista); setTotal(r.totalRegistros); setPageSize(r.tamanhoPagina); })
      .catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar os orçamentos."))
      .finally(() => setLoading(false));
  }, [q, from, until, filters, page, orderBy, desc]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { quotesClient.filters().then(setOptions).catch(() => {}); }, []);

  function sortBy(key: string) {
    if (orderBy === key) setDesc((d) => !d); else { setOrderBy(key); setDesc(true); }
    setPage(1);
  }
  const arrow = (key: string) => (orderBy === key ? (desc ? " ↓" : " ↑") : "");

  async function exportCsv() {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const all: QuoteRow[] = [];
    for (let p = 1; p <= pages; p++) all.push(...(await quotesClient.list({ q, from, until, ...filters, page: p, orderBy, desc })).lista);
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ["Orçamento;Cliente;Título;Vendedor;Abertura;Validade;Situação;Recorrente;Total", ...all.map((r) => [formatQuoteNumber(r.number), esc(r.personName), esc(r.title ?? ""), esc(r.sellerName ?? ""), new Date(r.openedAt).toLocaleDateString("pt-BR"), new Date(r.validUntil).toLocaleDateString("pt-BR"), QUOTE_STATUS[r.status]?.label ?? r.status, r.recurring.toFixed(2).replace(".", ","), r.total.toFixed(2).replace(".", ",")].join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "orcamentos.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await fn(); await load(); setReload((n) => n + 1); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir a operação."); } finally { setBusy(false); setCancelling(null); }
  }

  async function sendMail(row: QuoteRow) {
    const quote = await quotesClient.get(row.id);
    if (!quote?.contactEmail) return setError("Este orçamento não tem e-mail de contato. Informe o e-mail no cadastro do cliente.");
    window.location.href = `mailto:${quote.contactEmail}?subject=${encodeURIComponent(`Orçamento ${formatQuoteNumber(row.number)}`)}&body=${encodeURIComponent(`Olá, segue o orçamento ${formatQuoteNumber(row.number)} no valor de ${money(row.total)}.`)}`;
  }

  async function sendWhatsapp(row: QuoteRow) {
    const quote = await quotesClient.get(row.id);
    const phone = (quote?.contactPhone ?? "").replace(/\D/g, "");
    if (!phone) return setError("Este orçamento não tem telefone de contato. Informe o telefone no cadastro do cliente.");
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá! Segue o orçamento ${formatQuoteNumber(row.number)} no valor de ${money(row.total)}.`)}`, "_blank", "noopener");
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2);
  const activeFilters = Object.entries(filters).filter(([, v]) => v).length;

  const items: { label: string; icon: string; danger?: boolean; show?: boolean; onClick: (row: QuoteRow) => void }[] = [
    { label: "Imprimir", icon: "print", onClick: (r) => router.push(`/comercial/orcamentos/${r.id}?imprimir=1`) },
    { label: "Enviar via E-mail", icon: "mail", onClick: (r) => void sendMail(r) },
    { label: "Enviar via WhatsApp", icon: "chat", onClick: (r) => void sendWhatsapp(r) },
    { label: "Trocar para Locação", icon: "swap_horiz", show: menu ? EDITABLE.includes(menu.row.status) && menu.row.modality !== 1 : false, onClick: (r) => void run(() => quotesClient.setModality(r.id, 1)) },
    { label: "Trocar para Venda", icon: "swap_horiz", show: menu ? EDITABLE.includes(menu.row.status) && menu.row.modality !== 2 : false, onClick: (r) => void run(() => quotesClient.setModality(r.id, 2)) },
    { label: "Duplicar", icon: "content_copy", onClick: (r) => void run(async () => { const copy = await quotesClient.duplicate(r.id); router.push(`/comercial/orcamentos/${copy.id}`); }) },
    { label: "Cancelar Orçamento", icon: "cancel", danger: true, show: menu ? ![1, 7, 8].includes(menu.row.status) : false, onClick: (r) => setCancelling(r) },
  ];

  return (
    <PageShell permissionKey={COMERCIAL_KEYS.orcamentos}>
      {() => (
        <div onClick={() => { if (menu) setMenu(null); }}>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Orçamentos" }]} />
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ds-primary-deep">Orçamentos</h1>
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => void exportCsv()} aria-label="Exportar" title="Exportar para CSV" className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-ds-primary-deep text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="download" className="text-[20px]" /></button>
              <Link href="/comercial/orcamentos/novo" className="btn-add inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold text-white transition-all hover:-translate-y-px"><Icon name="add" className="text-[18px]" /> Novo Orçamento</Link>
            </span>
          </div>

          <QuoteInsights reload={reload} />

          <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(text.trim()); }} className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-ds-border-subtle bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-ds-text-muted">Aberto entre</span>
              <Input type="date" aria-label="De" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" />
              <span className="text-xs text-ds-text-secondary">e</span>
              <Input type="date" aria-label="Até" value={until} onChange={(e) => { setUntil(e.target.value); setPage(1); }} className="w-40" />
            </div>
            <div className="relative min-w-[220px] max-w-md flex-1">
              <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Pesquisar por número, cliente ou título..." className="pr-12" />
              <button type="submit" aria-label="Pesquisar" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-[10px] bg-ds-primary-deep text-white"><Icon name="search" className="text-[18px]" /></button>
            </div>
            <div className="relative">
              <button type="button" aria-label="Filtros" aria-expanded={panel} title="Filtros" onClick={(e) => { e.stopPropagation(); setDraft(filters); setPanel((o) => !o); }} className="relative flex h-11 w-12 items-center justify-center rounded-[10px] bg-ds-primary-deep text-white">
                <Icon name="filter_alt" className="text-[18px]" /><Icon name="arrow_drop_down" className="text-[16px]" />
                {activeFilters > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ds-primary text-[10px] font-bold">{activeFilters}</span>}
              </button>
              {panel && (
                <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-12 z-30 w-[min(92vw,34rem)] rounded-xl border border-ds-border-subtle bg-white p-4 shadow-xl">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-ds-text-secondary">Situação</span>
                      <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={selectClass}><option value="">Todas</option>{QUOTE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{QUOTE_STATUS[s].label}</option>)}</select></label>
                    <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-ds-text-secondary">Modalidade</span>
                      <select value={draft.modality} onChange={(e) => setDraft({ ...draft, modality: e.target.value })} className={selectClass}><option value="">Todas</option><option value="2">Venda</option><option value="1">Locação</option></select></label>
                    <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-ds-text-secondary">Tipo de Cliente</span>
                      <select value={draft.personType} onChange={(e) => setDraft({ ...draft, personType: e.target.value })} className={selectClass}><option value="">Todos</option><option value="F">Pessoa Física</option><option value="J">Pessoa Jurídica</option></select></label>
                    <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-ds-text-secondary">Vendedor</span>
                      <select value={draft.seller} onChange={(e) => setDraft({ ...draft, seller: e.target.value })} className={selectClass}><option value="">Todos</option>{options.sellers.map((s) => <option key={s}>{s}</option>)}</select></label>
                    <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-ds-text-secondary">Motivo da Recusa/Perda</span>
                      <select value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} className={selectClass}><option value="">Todos</option>{options.reasons.map((s) => <option key={s}>{s}</option>)}</select></label>
                    <label className="flex cursor-pointer items-center gap-2 self-end pb-3 text-sm text-ds-text"><input type="checkbox" checked={draft.hideCancelled} onChange={(e) => setDraft({ ...draft, hideCancelled: e.target.checked })} className="h-4 w-4 accent-ds-primary" />Ocultar orçamentos cancelados</label>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => { setFilters(draft); setPage(1); setPanel(false); }} className="h-11 flex-1 rounded-[10px] bg-ds-primary text-sm font-bold text-white hover:bg-ds-primary-hover">Aplicar Filtros</button>
                    {activeFilters > 0 && <button type="button" onClick={() => { setFilters(NONE); setDraft(NONE); setPage(1); setPanel(false); }} className="h-11 rounded-[10px] border border-ds-border px-4 text-sm font-semibold text-ds-text-muted hover:bg-ds-bg">Limpar</button>}
                  </div>
                </div>
              )}
            </div>
          </form>

          {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}

          <div className={`ds-table-wrap ${loading || busy ? "opacity-60" : ""}`}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th><SortButton label="Orçamento" active={orderBy === "number"} desc={desc} onClick={() => sortBy("number")} /></th>
                  <th className="md:text-right"><SortButton label="Recorrente" active={orderBy === "recurring"} desc={desc} onClick={() => sortBy("recurring")} /></th>
                  <th className="md:text-right"><SortButton label="Total" active={orderBy === "total"} desc={desc} onClick={() => sortBy("total")} /></th>
                  <th><SortButton label="Situação" active={orderBy === "status"} desc={desc} onClick={() => sortBy("status")} /></th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Orçamento" className="ds-strong">
                      <Link href={`/comercial/orcamentos/${r.id}`} className="hover:underline"><span className="mr-2 text-ds-primary">{formatQuoteNumber(r.number)}</span>{r.personName}</Link>
                      {r.personNickname && <span className="ml-1 text-xs font-normal text-ds-text-secondary">{r.personNickname}</span>}
                      {r.personIsLead && <span className="ml-2 rounded-full bg-ds-primary-deep px-2 py-0.5 text-[10px] font-bold text-white">Lead</span>}
                      {r.title && <span className="block text-xs font-normal text-ds-text-secondary">{r.title}</span>}
                    </td>
                    <td data-label="Recorrente" className="whitespace-nowrap md:text-right">{money(r.recurring)}</td>
                    <td data-label="Total" className="whitespace-nowrap font-semibold md:text-right">{money(r.total)}</td>
                    <td data-label="Situação"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${QUOTE_STATUS[r.status]?.className ?? ""}`}>{QUOTE_STATUS[r.status]?.label ?? r.status}</span></td>
                    <td data-label="Ações">
                      <span className="flex items-center justify-end gap-2 md:justify-center">
                        <Link href={`/comercial/orcamentos/${r.id}`} aria-label="Abrir orçamento" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-ds-primary-deep text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="edit_square" className="text-[16px]" /></Link>
                        <button type="button" aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); if (menu?.row.id === r.id) return setMenu(null); const rect = e.currentTarget.getBoundingClientRect(); setMenu({ row: r, top: rect.bottom + 4, right: window.innerWidth - rect.right }); }} className="inline-flex items-center gap-1 rounded-md border border-ds-primary-deep px-2.5 py-1 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white">Ações<Icon name="arrow_drop_down" className="text-[16px]" /></button>
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && <tr><td colSpan={5} className="text-center">Nenhum orçamento encontrado.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-ds-text-secondary">
            <span>{first} a {last} de {total} registros</span>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior" className="h-9 w-9 rounded-lg border border-ds-border bg-white disabled:opacity-40"><Icon name="chevron_left" /></button>
              {pages.map((p, i) => (
                <span key={p} className="flex items-center gap-1.5">
                  {i > 0 && p - pages[i - 1] > 1 && <span className="px-1">…</span>}
                  <button type="button" onClick={() => setPage(p)} className={`h-9 w-9 rounded-lg border text-sm font-semibold ${p === page ? "border-ds-primary-deep bg-ds-primary-deep text-white" : "border-ds-border bg-white"}`}>{p}</button>
                </span>
              ))}
              <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página" className="h-9 w-9 rounded-lg border border-ds-border bg-white disabled:opacity-40"><Icon name="chevron_right" /></button>
            </div>
          </div>

          {menu && (
            <ul role="menu" style={{ top: menu.top, right: menu.right }} className="fixed z-40 w-56 overflow-hidden rounded-lg border border-ds-border-subtle bg-white py-1 text-sm shadow-xl">
              {items.filter((i) => i.show !== false).map((item) => (
                <li key={item.label}><button role="menuitem" type="button" onClick={() => { const row = menu.row; setMenu(null); item.onClick(row); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-ds-bg ${item.danger ? "text-ds-danger-text" : "text-ds-primary-deep"}`}><Icon name={item.icon} className="text-[16px]" />{item.label}</button></li>
              ))}
            </ul>
          )}

          <Modal open={!!cancelling} onClose={() => setCancelling(null)} labelledBy="cancel-quote-title">
            {cancelling && (
              <>
                <h2 id="cancel-quote-title" className="mb-2 text-lg font-bold text-ds-primary-deep">Cancelar o orçamento {formatQuoteNumber(cancelling.number)}?</h2>
                <p className="mb-6 text-sm text-ds-text-muted">O orçamento de {cancelling.personName} ficará como cancelado e não poderá mais ser alterado.</p>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setCancelling(null)}>Voltar</Button>
                  <Button type="button" variant="danger" disabled={busy} onClick={() => void run(() => quotesClient.cancel(cancelling.id))}>{busy ? "Aguarde..." : "Cancelar orçamento"}</Button>
                </div>
              </>
            )}
          </Modal>
        </div>
      )}
    </PageShell>
  );
}
