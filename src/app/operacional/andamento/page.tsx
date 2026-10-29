"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { OsDetailModal } from "@/components/operacional/os-detail";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/cadastros";
import { formatQuoteNumber } from "@/lib/comercial";
import { billing } from "@/lib/faturamento";
import { OPERACIONAL_KEYS, fmtDate, formatOsNumber, openFromQuote, osClient, type BoardColumn } from "@/lib/operacional";

function Board() {
  const [columns, setColumns] = useState<BoardColumn[] | null>(null);
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => osClient.board().then(setColumns).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")), []);
  useEffect(() => { void load(); }, [load]);

  async function bill(orderId: string, kind: "S" | "P", motivo: number, cardId: string) {
    if (!orderId || !window.confirm(`Faturar ${kind === "P" ? "produtos" : "serviços"} desta OS?`)) return;
    setBusy(cardId); setError("");
    try { await billing.invoiceOrder(orderId, kind, motivo); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível faturar."); } finally { setBusy(null); }
  }

  async function openOs(quoteId: string) {
    setBusy(quoteId); setError("");
    try { const os = await openFromQuote(quoteId); await load(); setOpenId(os.id); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível abrir a OS."); } finally { setBusy(null); }
  }

  const term = q.trim().toLowerCase();
  const visible = (c: BoardColumn) => c.cards.filter((card) => !term || card.personName.toLowerCase().includes(term) || formatOsNumber(card.number).includes(term) || (card.title ?? "").toLowerCase().includes(term));

  return (
    <div>
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Andamento do Operacional" }]} />
      <h1 className="mb-5 text-xl font-bold text-ds-primary-deep">Andamento Operacional</h1>
      <div className="mb-5 rounded-xl border border-ds-border-subtle bg-white p-4">
        <div className="relative max-w-md"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" /><Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por cliente, número ou título..." className="pl-10" aria-label="Pesquisar no andamento" /></div>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      {!columns ? <p className="py-10 text-center text-sm text-ds-text-secondary">Carregando...</p> : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((c) => {
            const cards = visible(c);
            const shut = collapsed[c.key];
            return (
              <section key={c.key} aria-label={c.title} className="flex max-h-[calc(100vh-15rem)] w-[300px] shrink-0 flex-col rounded-xl border-t-4 border-t-[#F7941D] border-x border-b border-x-ds-border-subtle border-b-ds-border-subtle bg-white">
                <header className="flex items-center gap-2 px-3 py-3">
                  <button type="button" onClick={() => setCollapsed((s) => ({ ...s, [c.key]: !shut }))} aria-expanded={!shut} aria-label={shut ? "Expandir coluna" : "Recolher coluna"} className="text-ds-text-secondary hover:text-ds-primary"><Icon name={shut ? "expand_more" : "expand_less"} className="text-[20px]" /></button>
                  <h2 className="min-w-0 flex-1 rounded-full bg-[#F7941D] px-3 py-1 text-xs font-bold leading-tight text-white">{c.title}</h2>
                  <span className="flex items-center gap-1 text-sm font-semibold text-ds-text-muted"><Icon name="format_list_bulleted" className="text-[16px]" />{cards.length}</span>
                </header>
                {!shut && (
                  <div className="min-h-[8rem] flex-1 space-y-3 overflow-y-auto px-3 pb-3">
                    {cards.length === 0 && <div className="flex flex-col items-center gap-2 py-10 text-sm text-ds-text-secondary"><Icon name="inbox" className="!text-[40px] text-ds-border" />Sem dados para exibir</div>}
                    {cards.map((card) => (
                      <article key={card.id} className="rounded-lg border border-ds-border-subtle bg-white p-3 text-sm shadow-sm">
                        <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-ds-primary-deep">{card.personName}</h3><span className="shrink-0 rounded bg-ds-bg px-1.5 py-0.5 text-[11px] font-bold text-ds-primary-deep">{c.kind === "quote" ? formatQuoteNumber(card.number) : formatOsNumber(card.number)}</span></div>
                        {c.kind === "bill" ? (
                          <>
                            <p className="mt-1 text-xs text-ds-text-secondary">Abertura: {fmtDate(card.openedAt)}</p>
                            <p className="text-xs"><span className="rounded-full border border-ds-primary-deep px-1.5 text-[10px] text-ds-primary-deep">{card.typeLabel}</span></p>
                            <p className="mt-1 text-xs text-ds-text-secondary">Fechamento: {fmtDate(card.closedAt)}</p>
                            <p className="mt-1 text-right text-xs font-bold text-ds-primary-deep">{money(card.total ?? 0)}</p>
                            <button type="button" disabled={busy === card.id} onClick={() => void bill(card.orderId ?? "", card.kind ?? "S", card.motivo ?? 0, card.id)} className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#F7941D] text-xs font-semibold text-[#F7941D] hover:bg-[#F7941D] hover:text-white disabled:opacity-50"><Icon name="receipt_long" className="text-[16px]" />{busy === card.id ? "Faturando..." : card.kind === "P" ? "Faturar Produtos" : "Faturar Serviços"}</button>
                          </>
                        ) : c.kind === "quote" ? (
                          <>
                            <p className="mt-1 text-xs text-ds-text-muted">{card.title}</p>
                            <p className="mt-1 flex items-center justify-between text-xs text-ds-text-secondary"><span>Ganho: {fmtDate(card.wonAt)}</span><strong className="text-ds-primary-deep">{money(card.total ?? 0)}</strong></p>
                            <button type="button" disabled={busy === card.id} onClick={() => void openOs(card.id)} className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#F7941D] text-xs font-semibold text-[#F7941D] hover:bg-[#F7941D] hover:text-white disabled:opacity-50"><Icon name="build" className="text-[16px]" />{busy === card.id ? "Abrindo..." : "Abrir OS"}</button>
                          </>
                        ) : (
                          <>
                            <p className="mt-1 text-xs text-ds-text-secondary">Abertura: {fmtDate(card.openedAt)} <span className="ml-1 rounded-full border border-ds-primary-deep px-1.5 text-[10px] text-ds-primary-deep">{card.typeLabel}</span></p>
                            <p className={`text-xs ${card.status === 1 ? "font-semibold text-ds-danger-text" : "text-ds-text-secondary"}`}>Previsão de Conclusão: {fmtDate(card.scheduleEnd)}</p>
                            <p className="mt-1 text-right text-xs font-bold text-ds-primary-deep">{money(card.total ?? 0)}</p>
                            <button type="button" onClick={() => setOpenId(card.id)} className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#F7941D] text-xs font-semibold text-[#F7941D] hover:bg-[#F7941D] hover:text-white"><Icon name="build" className="text-[16px]" />Ver Detalhes</button>
                          </>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      {openId && <OsDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => void load()} onEdit={() => setOpenId(null)} />}
    </div>
  );
}

export default function ProgressPage() {
  return <PageShell permissionKey={OPERACIONAL_KEYS.andamento}>{() => <Board />}</PageShell>;
}
