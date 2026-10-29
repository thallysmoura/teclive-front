"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/page-shell";
import { Modal, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { money } from "@/lib/cadastros";
import { dateBr, download, fin, isoDay, num, type CashAccount, type Category, type FinAccount, type Method } from "@/lib/financeiro";

const first = () => { const d = new Date(); d.setDate(1); return isoDay(d); };
const lastDay = () => { const d = new Date(); return isoDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
const STATUS = { ABERTA: ["bg-[#FDE6E4] text-[#B42318]", "A Pagar", "A Receber"], LIQUIDADA: ["bg-[#DDF6EA] text-[#0B7A4B]", "Pago", "Recebido"], CANCELADA: ["bg-[#ECEFF3] text-[#5B6775]", "Cancelada", "Cancelada"] } as const;

function Row({ a, kind, onChanged, cash, methods, categories }: { a: FinAccount; kind: "R" | "P"; onChanged: () => void; cash: CashAccount[]; methods: Method[]; categories: Category[] }) {
  const [menu, setMenu] = useState(false);
  const [dlg, setDlg] = useState<"settle" | "edit" | null>(null);
  const [f, setF] = useState({ cash: "", date: isoDay(new Date()), paid: String(a.value).replace(".", ","), method: a.paymentMethod ?? "", desc: a.description, value: String(a.value).replace(".", ","), due: a.dueDate.slice(0, 10), category: a.categoryId ?? "" });
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);
  const st = STATUS[a.status];
  const run = async (fn: () => Promise<unknown>) => { setError(""); try { await fn(); setDlg(null); onChanged(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir."); } };
  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ds-bg";
  const overdue = a.status === "ABERTA" && new Date(a.dueDate) < new Date(new Date().toDateString());
  return (
    <tr className="border-t border-ds-border-subtle">
      <td className="whitespace-nowrap px-4 py-3 text-ds-text-muted">{dateBr(a.dueDate)}</td>
      <td className="px-3 py-3"><p className="font-semibold text-ds-primary-deep">{a.personName}{a.installment && <span className="ml-2 rounded bg-ds-primary/10 px-1.5 text-[10px] font-bold text-ds-primary">{a.installment}</span>}{a.invoiceNumber && <Link href="/faturamento/central" className="ml-2 text-[11px] font-bold text-ds-primary hover:underline">Fatura {a.invoiceNumber}</Link>}</p><p className="text-xs text-ds-text-secondary">{a.number ? `${a.number} - ` : ""}{a.description}</p></td>
      <td className="px-3 py-3 text-right text-ds-text-muted">{a.paidValue !== null ? money(a.paidValue) : ""}</td>
      <td className="px-3 py-3 text-right font-semibold">{money(a.value)}</td>
      <td className="px-3 py-3 text-center"><span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${overdue ? "bg-[#B42318] text-white" : st[0]}`}>{overdue ? "Atrasada" : kind === "P" ? st[1] : st[2]}</span></td>
      <td className="px-3 py-3">
        <div ref={box} className="relative flex justify-center">
          <button type="button" onClick={() => setMenu((v) => !v)} aria-label="Ações da conta" aria-expanded={menu} className="inline-flex h-8 items-center rounded-lg border border-ds-border px-1.5 text-ds-primary hover:border-ds-primary"><Icon name="settings" className="text-[16px]" /><Icon name="arrow_drop_down" className="text-[18px]" /></button>
          {menu && (
            <div role="menu" onClick={() => setMenu(false)} className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-ds-border-subtle bg-white py-1 shadow-xl">
              {a.status === "ABERTA" && <button role="menuitem" type="button" className={item} onClick={() => setDlg("settle")}><Icon name="paid" className="text-[18px] text-[#0B7A4B]" />{kind === "P" ? "Pagar" : "Receber"} (baixar)</button>}
              {a.status === "LIQUIDADA" && <button role="menuitem" type="button" className={item} onClick={() => { if (confirm("Estornar a baixa desta conta?")) void run(() => fin.reverse(a.id)); }}><Icon name="undo" className="text-[18px] text-ds-primary" />Estornar baixa</button>}
              {a.status === "ABERTA" && <button role="menuitem" type="button" className={item} onClick={() => setDlg("edit")}><Icon name="edit" className="text-[18px] text-ds-primary" />Editar</button>}
              {a.status === "ABERTA" && <button role="menuitem" type="button" className={`${item} text-ds-danger-text`} onClick={() => { if (confirm("Excluir esta conta?")) void run(() => fin.deleteAccount(a.id)); }}><Icon name="delete" className="text-[18px]" />Excluir</button>}
              {a.status === "CANCELADA" && <p className="px-3 py-2 text-xs text-ds-text-secondary">{a.note ?? "Conta cancelada"}</p>}
            </div>
          )}
        </div>
        {dlg === "settle" && (
          <Modal title={kind === "P" ? "Pagar conta" : "Receber conta"} onClose={() => setDlg(null)}>
            <p className="mb-3 text-sm text-ds-text-muted">{a.personName} · {a.description}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className={label}>Conta de caixa *</span><select value={f.cash} onChange={(e) => setF({ ...f, cash: e.target.value })} className={field}><option value="">Selecione...</option>{cash.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label><span className={label}>Data *</span><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={field} /></label>
              <label><span className={label}>Valor (R$)</span><input inputMode="decimal" value={f.paid} onChange={(e) => setF({ ...f, paid: e.target.value })} className={field} /></label>
              <label className="sm:col-span-2"><span className={label}>Forma de pagamento</span><select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} className={field}><option value="">-</option>{methods.map((m) => <option key={m.id}>{m.description}</option>)}</select></label>
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
            <div className="mt-4 flex gap-2"><button type="button" className={btnPrimary} onClick={() => void run(() => fin.settle(a.id, { cashAccountId: f.cash, date: f.date, paidValue: num(f.paid), paymentMethod: f.method }))}>Confirmar</button><button type="button" className={btnGhost} onClick={() => setDlg(null)}>Cancelar</button></div>
          </Modal>
        )}
        {dlg === "edit" && (
          <Modal title="Editar conta" onClose={() => setDlg(null)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className={label}>Descrição</span><input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} className={field} /></label>
              <label><span className={label}>Vencimento</span><input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} className={field} /></label>
              <label><span className={label}>Valor (R$)</span><input inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className={field} /></label>
              <label className="sm:col-span-2"><span className={label}>Categoria</span><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={field}><option value="">Sem categoria</option>{categories.filter((c) => c.kind === (kind === "P" ? "D" : "R") && c.level >= 3).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
            <div className="mt-4 flex gap-2"><button type="button" className={btnPrimary} onClick={() => void run(() => fin.updateAccount(a.id, { description: f.desc, dueDate: f.due, value: num(f.value), categoryId: f.category || null }))}>Salvar</button><button type="button" className={btnGhost} onClick={() => setDlg(null)}>Cancelar</button></div>
          </Modal>
        )}
      </td>
    </tr>
  );
}

export function Accounts({ kind }: { kind: "R" | "P" }) {
  const [f, setF] = useState({ q: "", from: first(), to: lastDay(), dateType: "due", status: "", method: "" });
  const [applied, setApplied] = useState(f);
  const [adv, setAdv] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "due", desc: true });
  const [data, setData] = useState<Awaited<ReturnType<typeof fin.accounts>> | null>(null);
  const [error, setError] = useState("");
  const [cash, setCash] = useState<CashAccount[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [create, setCreate] = useState(false);
  const [n, setN] = useState({ person: "", desc: "", value: "", due: isoDay(new Date()), installments: "1", method: "", category: "" });
  const [cError, setCError] = useState("");
  useEffect(() => { void fin.cashAccounts().then(setCash).catch(() => undefined); void fin.methods().then(setMethods).catch(() => undefined); void fin.categories().then(setCats).catch(() => undefined); }, []);

  const load = useCallback(() => fin.accounts({ kind, q: applied.q, from: applied.from, to: applied.to, dateType: applied.dateType, status: applied.status, method: applied.method, sort: sort.key, desc: sort.desc, page }).then((d) => { setData(d); setError(""); }).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")), [kind, applied, sort, page]);
  useEffect(() => { void load(); }, [load]);

  const title = kind === "P" ? "Contas a Pagar" : "Contas a Receber";
  const th = (key: string, text: string, cls = "") => <th className={`px-3 py-3 ${cls}`}><button type="button" onClick={() => { setSort((s) => ({ key, desc: s.key === key ? !s.desc : true })); setPage(1); }} className="inline-flex items-center gap-1 font-bold">{text}<Icon name={sort.key === key ? (sort.desc ? "arrow_downward" : "arrow_upward") : "unfold_more"} className="text-[14px] opacity-60" /></button></th>;
  const exportCsv = () => download(`${title.toLowerCase().replace(/ /g, "-")}.csv`, `﻿Vencimento;Cliente/Fornecedor;Descrição;Parcela;Valor;Valor liquidado;Status\n${(data?.lista ?? []).map((a) => [dateBr(a.dueDate), a.personName, a.description, a.installment ?? "", a.value.toFixed(2).replace(".", ","), a.paidValue?.toFixed(2).replace(".", ",") ?? "", a.status].join(";")).join("\n")}`, "text/csv;charset=utf-8");
  async function save() {
    setCError("");
    try { await fin.createAccount({ kind, personName: n.person, description: n.desc, value: num(n.value), dueDate: n.due, installments: Number(n.installments) || 1, paymentMethod: n.method, categoryId: n.category || undefined }); setCreate(false); setN({ ...n, person: "", desc: "", value: "" }); void load(); }
    catch (e) { setCError(e instanceof Error ? e.message : "Não foi possível salvar."); }
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: title }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">{title}</h1><div className="flex gap-2"><button type="button" onClick={exportCsv} className={`${btnGhost} gap-1.5`}><Icon name="download" className="text-[18px]" />Exportar</button><button type="button" onClick={() => setCreate(true)} className={btnPrimary}>Nova Conta a {kind === "P" ? "Pagar" : "Receber"}</button></div></header>
      <nav className="mb-0 flex gap-1" aria-label="Tipo de conta"><Link href="/financeiro/receber" className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold ${kind === "R" ? "border-ds-border-subtle border-t-[3px] border-t-[#F7941D] bg-white text-ds-primary-deep" : "border-transparent text-ds-text-muted"}`}>Contas a Receber</Link><Link href="/financeiro/pagar" className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold ${kind === "P" ? "border-ds-border-subtle border-t-[3px] border-t-[#F7941D] bg-white text-ds-primary-deep" : "border-transparent text-ds-text-muted"}`}>Contas a Pagar</Link></nav>
      <div className={`${card} rounded-tl-none`}>
        <form onSubmit={(e) => { e.preventDefault(); setApplied(f); setPage(1); }} className="border-b border-ds-border-subtle p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={f.dateType} onChange={(e) => setF({ ...f, dateType: e.target.value })} aria-label="Tipo de data" className={`${field} w-44`}><option value="due">Vencimento entre</option><option value="issued">Emitido entre</option></select>
            <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label="Data inicial" className={`${field} w-40`} /><input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-label="Data final" className={`${field} w-40`} />
            <div className="relative min-w-[200px] flex-1"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ds-text-secondary" /><input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Pesquisa por descrição da conta, valor da conta..." className={`${field} pl-10`} /></div>
            <button type="submit" className={btnPrimary}>Buscar</button>
            <button type="button" onClick={() => setAdv((v) => !v)} aria-expanded={adv} className="inline-flex h-10 items-center gap-1 text-sm font-bold text-ds-primary"><Icon name="filter_alt" className="text-[18px]" />Filtros avançados</button>
          </div>
          {adv && <div className="mt-3 flex flex-wrap gap-3"><label className="text-xs font-bold text-ds-text-secondary">Situação<select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={`${field} mt-1 w-44`}><option value="">Todas</option><option value="ABERTA">Em aberto</option><option value="LIQUIDADA">{kind === "P" ? "Pagas" : "Recebidas"}</option><option value="CANCELADA">Canceladas</option></select></label><label className="text-xs font-bold text-ds-text-secondary">Forma de pagamento<select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} className={`${field} mt-1 w-56`}><option value="">Todas</option>{methods.map((m) => <option key={m.id}>{m.description}</option>)}</select></label></div>}
        </form>
        {data && <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-ds-border-subtle bg-ds-bg/50 px-4 py-2.5 text-sm"><span>Total <b className="text-ds-primary-deep">{money(data.totals.value)}</b></span><span>{kind === "P" ? "Pago" : "Recebido"} <b className="text-[#0B7A4B]">{money(data.totals.paid)}</b></span><span>Em aberto <b className="text-[#B42318]">{money(data.totals.open)}</b></span><span className="ml-auto text-xs text-ds-text-secondary">{data.total} registros</span></div>}
        {error && <p role="alert" className="m-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr>{th("due", "Vencimento", "pl-4")}{th("client", "Descrição")}<th className="px-3 py-3 text-right font-bold">Valor Liquidado</th>{th("value", "Valor", "text-right")}<th className="px-3 py-3 text-center font-bold">Status</th><th className="px-3 py-3 text-center font-bold">Ações</th></tr></thead>
          <tbody>{!data ? <tr><td colSpan={6} className="py-12 text-center text-ds-text-secondary">Carregando...</td></tr> : data.lista.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-ds-text-secondary">Nenhuma conta encontrada para os filtros.</td></tr> : data.lista.map((a) => <Row key={a.id} a={a} kind={kind} onChanged={() => void load()} cash={cash} methods={methods} categories={cats} />)}</tbody></table></div>
        {data?.hasMore && <div className="border-t border-ds-border-subtle p-3 text-center"><button type="button" onClick={() => setPage((p) => p + 1)} className="text-sm font-bold text-ds-primary hover:underline">Carregar mais</button></div>}
      </div>
      {create && (
        <Modal title={`Nova Conta a ${kind === "P" ? "Pagar" : "Receber"}`} onClose={() => setCreate(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className={label}>{kind === "P" ? "Fornecedor" : "Cliente"} *</span><input value={n.person} onChange={(e) => setN({ ...n, person: e.target.value })} className={field} /></label>
            <label className="sm:col-span-2"><span className={label}>Descrição *</span><input value={n.desc} onChange={(e) => setN({ ...n, desc: e.target.value })} className={field} /></label>
            <label><span className={label}>Valor total (R$) *</span><input inputMode="decimal" value={n.value} onChange={(e) => setN({ ...n, value: e.target.value })} className={field} /></label>
            <label><span className={label}>1º vencimento *</span><input type="date" value={n.due} onChange={(e) => setN({ ...n, due: e.target.value })} className={field} /></label>
            <label><span className={label}>Parcelas</span><input type="number" min={1} max={60} value={n.installments} onChange={(e) => setN({ ...n, installments: e.target.value })} className={field} /></label>
            <label><span className={label}>Forma de pagamento</span><select value={n.method} onChange={(e) => setN({ ...n, method: e.target.value })} className={field}><option value="">-</option>{methods.map((m) => <option key={m.id}>{m.description}</option>)}</select></label>
            <label className="sm:col-span-2"><span className={label}>Categoria</span><select value={n.category} onChange={(e) => setN({ ...n, category: e.target.value })} className={field}><option value="">Sem categoria</option>{cats.filter((c) => c.kind === (kind === "P" ? "D" : "R") && c.level >= 3).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          </div>
          {cError && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{cError}</p>}
          <div className="mt-4 flex gap-2"><button type="button" className={btnPrimary} onClick={() => void save()}>Salvar</button><button type="button" className={btnGhost} onClick={() => setCreate(false)}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}
