"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Empty, Modal, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { money } from "@/lib/cadastros";
import { FIN_KEYS, dateBr, fin, isoDay, num, type CashAccount, type Movement } from "@/lib/financeiro";

function Cash() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [sel, setSel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ lista: Movement[]; total: number; pageSize: number; daily: { date: string; balance: number }[] } | null>(null);
  const [dlg, setDlg] = useState(false);
  const [f, setF] = useState({ type: "IN", to: "", value: "", description: "", date: isoDay(new Date()), person: "" });
  const [error, setError] = useState("");

  const loadAccounts = useCallback(() => fin.cashAccounts().then((a) => { setAccounts(a); setSel((s) => s || a.find((x) => x.name === "Banco Inter")?.id || a[0]?.id || ""); }).catch(() => undefined), []);
  useEffect(() => { void loadAccounts(); }, [loadAccounts]);
  const load = useCallback(() => (sel ? fin.movements({ cashAccountId: sel, from, to, page }).then(setData).catch(() => setData({ lista: [], total: 0, pageSize: 11, daily: [] })) : Promise.resolve()), [sel, from, to, page]);
  useEffect(() => { void load(); }, [load]);

  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const cur = accounts.find((a) => a.id === sel);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const series = data?.daily ?? [];
  const max = Math.max(1, ...series.map((d) => d.balance)), min = Math.min(0, ...series.map((d) => d.balance));

  async function save() {
    setError("");
    try { await fin.createMovement({ cashAccountId: sel, type: f.type, toAccountId: f.to, value: num(f.value), description: f.description, date: f.date, personName: f.person }); setDlg(false); setF({ ...f, value: "", description: "" }); void loadAccounts(); void load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível lançar."); }
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Movimento de Conta Caixa" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Movimento de Conta Caixa</h1><button type="button" disabled={!sel} onClick={() => { setDlg(true); setError(""); }} className={btnPrimary}>Novo lançamento</button></header>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className={`${card} p-2`}>
          <h2 className="flex justify-between px-3 py-2 text-xs font-bold uppercase tracking-wide text-ds-text-secondary"><span>Conta de Caixa</span><span>Saldo</span></h2>
          <ul>{accounts.map((a) => <li key={a.id}><button type="button" onClick={() => { setSel(a.id); setPage(1); }} aria-pressed={sel === a.id} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${sel === a.id ? "bg-ds-primary/10 font-bold text-ds-primary-deep" : "hover:bg-ds-bg"}`}><span>{a.name}</span><span className={a.balance < 0 ? "font-bold text-[#B42318]" : "font-semibold"}>{money(a.balance)}</span></button></li>)}</ul>
          <p className="mt-1 flex justify-between border-t border-ds-border-subtle px-3 py-2.5 text-sm font-extrabold text-ds-primary-deep"><span>Total</span><span>{money(total)}</span></p>
        </section>
        <section className={`${card} p-4`}>
          <h2 className="mb-2 text-sm font-bold text-ds-primary-deep">{cur?.name} (Saldo por dia)</h2>
          {series.length > 1 ? (
            <svg viewBox="0 0 400 110" className="h-32 w-full" role="img" aria-label="Saldo por dia"><polyline fill="none" stroke="#005CD2" strokeWidth="2" strokeLinejoin="round" points={series.map((d, i) => `${(i / (series.length - 1)) * 396 + 2},${104 - ((d.balance - min) / (max - min || 1)) * 96}`).join(" ")} /></svg>
          ) : <p className="py-8 text-center text-sm text-ds-text-secondary">Sem movimento suficiente para o gráfico.</p>}
        </section>
      </div>
      <div className={`${card} mt-4 overflow-x-auto`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-ds-border-subtle p-3"><span className="text-sm font-semibold text-ds-text-muted">Período do Movimento</span><input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="Data inicial" className={`${field} w-40`} />até<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="Data final" className={`${field} w-40`} /><button type="button" onClick={() => { setFrom(""); setTo(""); setPage(1); }} className={btnGhost}>Limpar</button></div>
        <table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th className="px-4 py-3 font-bold">Data do Movimento</th><th className="px-3 py-3 font-bold">Descrição</th><th className="px-3 py-3 text-right font-bold">Valor</th><th className="px-4 py-3 text-right font-bold">Saldo</th></tr></thead>
          <tbody>{!data || data.lista.length === 0 ? <Empty cols={4} loading={!data} text="Nenhum movimento no período." /> : data.lista.map((m) => <tr key={m.id} className="border-t border-ds-border-subtle"><td className="px-4 py-3 text-ds-text-muted">{dateBr(m.date)}</td><td className="px-3 py-3"><p className="font-semibold text-ds-primary-deep">{m.personName}</p><p className="text-xs text-ds-text-secondary">{m.description}</p></td><td className={`px-3 py-3 text-right font-semibold ${m.value < 0 ? "text-[#B42318]" : "text-[#0B7A4B]"}`}>{money(m.value)}</td><td className="px-4 py-3 text-right font-semibold">{money(m.balance)}</td></tr>)}</tbody></table>
        <div className="flex items-center justify-between border-t border-ds-border-subtle px-4 py-2.5 text-xs text-ds-text-secondary"><span>{data?.total ?? 0} registros</span><span className="flex items-center gap-1"><button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border disabled:opacity-40"><Icon name="chevron_left" className="text-[18px]" /></button>{page} / {pages}<button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border disabled:opacity-40"><Icon name="chevron_right" className="text-[18px]" /></button></span></div>
      </div>
      {dlg && (
        <Modal title={`Novo lançamento - ${cur?.name ?? ""}`} onClose={() => setDlg(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Tipo</span><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={field}><option value="IN">Entrada</option><option value="OUT">Saída</option><option value="TRANSFER">Transferência</option></select></label>
            <label><span className={label}>Data *</span><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={field} /></label>
            {f.type === "TRANSFER" && <label className="sm:col-span-2"><span className={label}>Conta de destino *</span><select value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className={field}><option value="">Selecione...</option>{accounts.filter((a) => a.id !== sel).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
            {f.type !== "TRANSFER" && <label className="sm:col-span-2"><span className={label}>Pessoa / origem</span><input value={f.person} onChange={(e) => setF({ ...f, person: e.target.value })} className={field} /></label>}
            <label className="sm:col-span-2"><span className={label}>Descrição *</span><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={field} /></label>
            <label><span className={label}>Valor (R$) *</span><input inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className={field} /></label>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
          <div className="mt-4 flex gap-2"><button type="button" className={btnPrimary} onClick={() => void save()}>Lançar</button><button type="button" className={btnGhost} onClick={() => setDlg(false)}>Cancelar</button></div>
        </Modal>
      )}
    </div>
  );
}

export default function CashMovementPage() { return <PageShell permissionKey={FIN_KEYS.movimento}>{() => <Cash />}</PageShell>; }
