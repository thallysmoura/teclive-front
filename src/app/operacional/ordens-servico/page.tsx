"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { OsDetailModal } from "@/components/operacional/os-detail";
import { OsFormModal } from "@/components/operacional/os-form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { SortButton } from "@/components/ui/sortable";
import { formatQuoteNumber } from "@/lib/comercial";
import { OPERACIONAL_KEYS, OS_STATUS, addressLine, fmtDate, fmtTime, formatOsNumber, osClient, type OsDetail, type OsFilters, type OsListParams, type OsRow, type OsStats } from "@/lib/operacional";

const selectClass = "h-10 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";
type PanelFilters = { type: string; status: string; technician: string; seller: string; defect: string; cause: string; solution: string; hideCancelled: boolean };
const NONE: PanelFilters = { type: "", status: "", technician: "", seller: "", defect: "", cause: "", solution: "", hideCancelled: false };

function Orders() {
  const [rows, setRows] = useState<OsRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [filters, setFilters] = useState<PanelFilters>(NONE);
  const [draft, setDraft] = useState<PanelFilters>(NONE);
  const [panel, setPanel] = useState(false);
  const [orderBy, setOrderBy] = useState("openedAt");
  const [desc, setDesc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<OsFilters | null>(null);
  const [stats, setStats] = useState<OsStats | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<{ os: OsDetail | null } | null>(null);
  const [menu, setMenu] = useState<{ row: OsRow; top: number; right: number } | null>(null);
  const [reload, setReload] = useState(0);
  // ?os=<id> (vindo de uma notificação) abre a OS direto para acompanhar.
  const pathname = usePathname();
  const osParam = useSearchParams().get("os");
  useEffect(() => { if (osParam) setOpenId(osParam); }, [osParam]);
  const closeDetail = () => { setOpenId(null); if (osParam) window.history.replaceState(null, "", pathname); };

  const params: OsListParams = { q, from, until, ...filters, page, orderBy, desc };
  const key = JSON.stringify(params);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await osClient.list(JSON.parse(key));
      setRows(result.lista); setTotal(result.totalRegistros); setPageSize(result.tamanhoPagina);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar."); } finally { setLoading(false); }
  }, [key]);

  useEffect(() => { void load(); }, [load, reload]);
  useEffect(() => { osClient.filters().then(setOptions).catch(() => {}); }, []);
  useEffect(() => { osClient.stats().then(setStats).catch(() => {}); }, [reload]);
  // Filtra enquanto digita.
  useEffect(() => {
    const t = setTimeout(() => { const next = text.trim(); setQ((c) => { if (c === next) return c; setPage(1); return next; }); }, 300);
    return () => clearTimeout(t);
  }, [text]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menu]);

  function sortBy(k: string) { if (orderBy === k) setDesc((d) => !d); else { setOrderBy(k); setDesc(k === "openedAt" || k === "scheduleEnd"); } setPage(1); }
  async function quick(fn: () => Promise<unknown>) { setError(""); try { await fn(); setReload((n) => n + 1); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir a operação."); } }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2);
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const chips = stats ? [0, 1, 8, 7, 4, 5, 2].map((s) => ({ s, n: (stats.byStatus[s] ?? 0) + (s === 4 ? stats.byStatus[6] ?? 0 : 0) })) : [];

  return (
    <div>
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Ordens de Serviço" }]} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ds-primary-deep">Ordens de Serviço</h1>
        <button type="button" onClick={() => setForm({ os: null })} className="btn-add inline-flex h-11 items-center gap-2 rounded-[10px] px-5 text-sm font-bold text-white transition-all hover:-translate-y-px"><Icon name="add" className="text-[20px]" />Nova OS</button>
      </div>

      {stats && (
        <div className="mb-5 flex flex-wrap gap-2" aria-label="Resumo por situação">
          {chips.map(({ s, n }) => (
            <button key={s} type="button" onClick={() => { setFilters({ ...filters, status: filters.status === String(s) ? "" : String(s) }); setPage(1); }} aria-pressed={filters.status === String(s)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${filters.status === String(s) ? "border-ds-primary-deep bg-ds-primary-deep text-white" : "border-ds-border bg-white text-ds-text-muted hover:border-ds-primary"}`}>
              {OS_STATUS[s].label} <span className="ml-1 opacity-80">{n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-ds-border-subtle bg-white p-4">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <span className="text-sm text-ds-text-muted">Aberto entre</span>
          <Input type="date" aria-label="De" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="min-w-0 flex-1 sm:w-40 sm:flex-none" />
          <span className="text-xs text-ds-text-secondary">e</span>
          <Input type="date" aria-label="Até" value={until} onChange={(e) => { setUntil(e.target.value); setPage(1); }} className="min-w-0 flex-1 sm:w-40 sm:flex-none" />
        </div>
        <div className="relative min-w-0 flex-1 basis-full sm:min-w-[220px] sm:basis-0">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" />
          <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Pesquisar por número, cliente, endereço ou motivo..." className="pl-10" aria-label="Pesquisar ordens de serviço" />
        </div>
        <div className="relative">
          <button type="button" aria-label="Filtros" aria-expanded={panel} title="Filtros" onClick={(e) => { e.stopPropagation(); setDraft(filters); setPanel((o) => !o); }} className="relative flex h-11 w-12 items-center justify-center rounded-[10px] border border-ds-primary-deep bg-ds-primary-deep text-white">
            <Icon name="filter_alt" className="text-[18px]" />{activeFilters > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F7941D] px-1 text-[11px] font-bold">{activeFilters}</span>}
          </button>
          {panel && (
            <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-13 z-30 w-[min(92vw,34rem)] rounded-xl border border-ds-border-subtle bg-white p-4 shadow-2xl">
              <div className="grid gap-3 sm:grid-cols-2">
                {([["type", "Tipo da OS", options?.types.map((t) => [t.value, t.label])], ["status", "Status", options?.statuses.map((t) => [t.value, t.label])], ["technician", "Técnico", options?.technicians.map((t) => [t, t])], ["seller", "Vendedor", options?.sellers.map((t) => [t, t])], ["defect", "Defeito/Motivo", options?.defects.map((t) => [t, t])], ["cause", "Causa", options?.causes.map((t) => [t, t])], ["solution", "Solução", options?.solutions.map((t) => [t, t])]] as const).map(([k, label, list]) => (
                  <label key={k} className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-ds-text-secondary">{label}
                    <select className={selectClass} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}><option value="">Todos</option>{(list ?? []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  </label>
                ))}
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-ds-text-muted"><input type="checkbox" checked={draft.hideCancelled} onChange={(e) => setDraft({ ...draft, hideCancelled: e.target.checked })} />Ocultar OS canceladas</label>
              </div>
              <div className="mt-4 flex gap-2"><button type="button" onClick={() => { setFilters(draft); setPage(1); setPanel(false); }} className="h-10 flex-1 rounded-lg bg-[#F7941D] text-sm font-bold text-white hover:brightness-95">Aplicar Filtros</button><button type="button" onClick={() => { setFilters(NONE); setDraft(NONE); setPage(1); setPanel(false); }} className="h-10 rounded-lg border border-ds-border px-4 text-sm font-semibold text-ds-text-muted">Limpar</button></div>
            </div>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}

      <div className={`ds-table-wrap ${loading ? "opacity-60" : ""}`}>
        <table className="ds-table">
          <thead>
            <tr>
              <th><SortButton label="Ordem de Serviço" active={orderBy === "number"} desc={desc} onClick={() => sortBy("number")} /></th>
              <th><SortButton label="Abertura" active={orderBy === "openedAt"} desc={desc} onClick={() => sortBy("openedAt")} /></th>
              <th><SortButton label="Conclusão Prev." active={orderBy === "scheduleEnd"} desc={desc} onClick={() => sortBy("scheduleEnd")} /></th>
              <th><SortButton label="Status" active={orderBy === "status"} desc={desc} onClick={() => sortBy("status")} /></th>
              <th className="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label="Ordem de Serviço" className="ds-strong">
                  <button type="button" onClick={() => setOpenId(r.id)} className="text-left hover:underline"><span className="mr-2 text-ds-primary">{formatOsNumber(r.number)}</span>{r.personName}</button>
                  {r.quoteNumbers.map((n) => <span key={n} className="ml-2 rounded-full border border-ds-primary-deep px-2 py-0.5 text-[10px] font-semibold text-ds-primary-deep">Orçamento {formatQuoteNumber(n)}</span>)}
                  <span className="block text-xs font-normal text-ds-text-secondary">{addressLine(r.address) || r.defect}</span>
                </td>
                <td data-label="Abertura" className="whitespace-nowrap">{fmtDate(r.openedAt)} <span className="text-xs text-ds-text-secondary">({fmtTime(r.openedAt)})</span></td>
                <td data-label="Conclusão Prev." className="whitespace-nowrap">{r.scheduleEnd ? <>{fmtDate(r.scheduleEnd)} <span className="text-xs text-ds-text-secondary">({fmtTime(r.scheduleEnd)})</span></> : "—"}</td>
                <td data-label="Status"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${OS_STATUS[r.status]?.className ?? ""}`}>{OS_STATUS[r.status]?.label ?? r.statusLabel}</span></td>
                <td data-label="Ações">
                  <span className="flex items-center justify-end gap-2 md:justify-center">
                    <button type="button" onClick={() => setOpenId(r.id)} aria-label="Abrir OS" title="Abrir OS" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-ds-primary-deep text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="edit_square" className="text-[16px]" /></button>
                    <button type="button" aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); if (menu?.row.id === r.id) return setMenu(null); const rect = e.currentTarget.getBoundingClientRect(); setMenu({ row: r, top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) }); }} className="inline-flex h-7 items-center gap-0.5 rounded-md border border-ds-primary-deep px-2 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white">Ações<Icon name="arrow_drop_down" className="text-[16px]" /></button>
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && <tr><td colSpan={5} className="text-center">Nenhuma ordem de serviço encontrada.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-ds-text-secondary">
        <span>{first} a {last} de {total} registros</span>
        <div className="flex items-center gap-1.5">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior" className="h-9 w-9 rounded-lg border border-ds-border bg-white disabled:opacity-40"><Icon name="chevron_left" className="text-[18px]" /></button>
          {pages.map((p, i) => (
            <span key={p} className="flex items-center gap-1.5">{i > 0 && p - pages[i - 1] > 1 && <span className="px-1">…</span>}
              <button type="button" onClick={() => setPage(p)} className={`h-9 w-9 rounded-lg border text-sm font-semibold ${p === page ? "border-ds-primary-deep bg-ds-primary-deep text-white" : "border-ds-border bg-white"}`}>{p}</button></span>
          ))}
          <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página" className="h-9 w-9 rounded-lg border border-ds-border bg-white disabled:opacity-40"><Icon name="chevron_right" className="text-[18px]" /></button>
        </div>
      </div>

      {menu && (
        <ul role="menu" style={{ top: menu.top, right: menu.right }} className="fixed z-40 w-52 overflow-hidden rounded-lg border border-ds-border-subtle bg-white py-1 text-sm shadow-xl">
          <li><button role="menuitem" type="button" onClick={() => { const r = menu.row; setMenu(null); setOpenId(r.id); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-ds-bg"><Icon name="visibility" className="text-[18px]" />Abrir detalhes</button></li>
          {[0, 1, 8].includes(menu.row.status) && <li><button role="menuitem" type="button" onClick={() => { const r = menu.row; setMenu(null); void osClient.get(r.id).then((os) => setForm({ os })).catch((e) => setError(e instanceof Error ? e.message : "Erro")); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-ds-bg"><Icon name="edit" className="text-[18px]" />Editar dados</button></li>}
          {[2, 3, 4].includes(menu.row.status) && <li><button role="menuitem" type="button" onClick={() => { const r = menu.row; setMenu(null); void quick(() => osClient.reopen(r.id)); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-ds-bg"><Icon name="restart_alt" className="text-[18px]" />Reabrir</button></li>}
          {[0, 1, 3, 7, 8].includes(menu.row.status) && <li><button role="menuitem" type="button" onClick={() => { const r = menu.row; setMenu(null); if (confirm(`Cancelar a OS ${formatOsNumber(r.number)}?`)) void quick(() => osClient.cancel(r.id)); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-ds-danger-text hover:bg-ds-danger-bg"><Icon name="cancel" className="text-[18px]" />Cancelar OS</button></li>}
        </ul>
      )}

      {openId && <OsDetailModal id={openId} onClose={closeDetail} onChanged={() => setReload((n) => n + 1)} onEdit={(os) => { setOpenId(null); setForm({ os }); }} />}
      {form && <OsFormModal os={form.os} onClose={() => setForm(null)} onSaved={(os) => { setForm(null); setReload((n) => n + 1); setOpenId(os.id); }} />}
    </div>
  );
}

export default function ServiceOrdersPage() {
  return <PageShell permissionKey={OPERACIONAL_KEYS.ordens}>{() => <Suspense><Orders /></Suspense>}</PageShell>;
}
