"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Empty, Modal, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { money } from "@/lib/cadastros";
import { adminApi, type Group } from "@/lib/contratos";
import { FAT_KEYS, billing, dateBr, pad, type ContractRow, type Invoice } from "@/lib/faturamento";

const MONTHS = ["Jan.", "Fev.", "Mar.", "Abr.", "Maio", "Jun.", "Jul.", "Ago.", "Set.", "Out.", "Nov.", "Dez."];

function Contracts() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [groups, setGroups] = useState<Group[]>([]);
  const [group, setGroup] = useState("");
  const [d1, setD1] = useState(1);
  const [d2, setD2] = useState(31);
  const [rows, setRows] = useState<ContractRow[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Invoice[] | null>(null);
  useEffect(() => { void adminApi.groups().then(setGroups).catch(() => undefined); }, []);
  const ym = `${year}-${String(month + 1).padStart(2, "0")}`;

  async function search() {
    setError(""); setMsg("");
    try { const r = await billing.searchContracts({ month: ym, groupId: group, dayFrom: d1, dayTo: d2 }); setRows(r); setSel(new Set(r.filter((c) => !c.billedInvoice && c.total > 0).map((c) => c.id))); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível buscar."); }
  }
  async function invoice() {
    setBusy(true); setError("");
    try { const r = await billing.invoiceContracts(ym, [...sel]); setMsg(`${r.created.length} fatura(s) gerada(s): ${r.created.map((n) => pad(n)).join(", ")}.`); await search(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível faturar."); } finally { setBusy(false); }
  }
  const total = rows?.filter((c) => sel.has(c.id)).reduce((s, c) => s + c.total, 0) ?? 0;

  return (
    <div className="mx-auto max-w-[1000px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Faturamento de Contratos" }]} />
      <div className={`${card} p-6 md:p-8`}>
        <h1 className="text-2xl font-extrabold text-ds-primary-deep">Faturamento de Contratos</h1>
        <p className="mb-5 border-b border-ds-border-subtle pb-4 text-sm text-ds-text-secondary">Aqui você pode realizar o faturamento de múltiplos contratos através de um único processo de forma prática e rápida.</p>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-bold text-ds-primary-deep">Qual mês que deseja faturar?</h2>
            <p className="mb-2 text-xs text-ds-text-secondary">O mês selecionado deve ser referente ao período em que o serviço foi prestado; buscamos os contratos com serviços em vigência nele.</p>
            <div className="max-w-xs rounded-xl border border-ds-border-subtle">
              <div className="flex items-center justify-between border-b border-ds-border-subtle px-3 py-2 text-sm font-bold"><button type="button" onClick={() => setYear((y) => y - 1)} aria-label="Ano anterior"><Icon name="chevron_left" className="text-[20px]" /></button>Ano {year}<button type="button" onClick={() => setYear((y) => y + 1)} aria-label="Próximo ano"><Icon name="chevron_right" className="text-[20px]" /></button></div>
              <div className="grid grid-cols-3">{MONTHS.map((m, i) => <button key={m} type="button" onClick={() => setMonth(i)} aria-pressed={month === i} className={`border-b border-r border-ds-border-subtle py-3 text-sm ${month === i ? "bg-ds-primary-deep font-bold text-white" : "hover:bg-ds-bg"}`}>{m}</button>)}</div>
            </div>
          </div>
          <div className="space-y-5">
            <label className="block"><span className="font-bold text-ds-primary-deep">Selecione um grupo de faturamento</span><span className="mb-2 block text-xs text-ds-text-secondary">Para visualizar somente os contratos deste grupo.</span><select value={group} onChange={(e) => setGroup(e.target.value)} className={field}><option value="">Todos</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.description}</option>)}</select></label>
            <div><span className="font-bold text-ds-primary-deep">Dias de cobrança a buscar</span><span className="mb-2 block text-xs text-ds-text-secondary">Somente contratos com dia de cobrança entre o dia {d1} e {d2}.</span><div className="flex items-center gap-2"><input type="number" min={1} max={31} value={d1} onChange={(e) => setD1(Math.min(31, Math.max(1, Number(e.target.value) || 1)))} className={`${field} w-24`} aria-label="Do dia" />até<input type="number" min={1} max={31} value={d2} onChange={(e) => setD2(Math.min(31, Math.max(1, Number(e.target.value) || 31)))} className={`${field} w-24`} aria-label="Até o dia" /></div></div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ds-border-subtle pt-5">
          <button type="button" onClick={() => void search()} className={btnPrimary}>Buscar Contratos</button>
          <button type="button" onClick={() => void billing.invoices({ kind: "S", origin: "CONTRATO", page: 1 }).then((r) => setDone(r.lista)).catch(() => setDone([]))} className={`${btnGhost} gap-1.5`}><Icon name="history" className="text-[18px]" />Faturamentos Realizados</button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
        {msg && <p role="status" className="mt-3 rounded-lg bg-[#DDF6EA] px-3 py-2 text-sm font-semibold text-[#0B7A4B]">{msg}</p>}
        {rows && (
          <div className="mt-5">
            <div className="overflow-x-auto rounded-xl border border-ds-border-subtle"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-ds-bg/60 text-xs text-ds-text-secondary"><tr><th className="w-10 px-3 py-2.5"><input type="checkbox" aria-label="Selecionar todos" checked={rows.filter((c) => !c.billedInvoice).length > 0 && rows.filter((c) => !c.billedInvoice).every((c) => sel.has(c.id))} onChange={(e) => setSel(e.target.checked ? new Set(rows.filter((c) => !c.billedInvoice && c.total > 0).map((c) => c.id)) : new Set())} className="h-4 w-4 accent-[#005CD2]" /></th><th className="px-3 py-2.5 font-bold">Contrato</th><th className="px-3 py-2.5 text-center font-bold">Venc.</th><th className="px-3 py-2.5 text-right font-bold">Valor</th><th className="px-3 py-2.5 text-center font-bold">Situação</th></tr></thead>
              <tbody>{rows.length === 0 && <Empty cols={5} loading={false} text="Nenhum contrato em vigência para os filtros." />}{rows.map((c) => <tr key={c.id} className="border-t border-ds-border-subtle"><td className="px-3 py-2.5"><input type="checkbox" disabled={!!c.billedInvoice || c.total <= 0} checked={sel.has(c.id)} onChange={(e) => setSel((s) => { const n = new Set(s); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n; })} className="h-4 w-4 accent-[#005CD2]" aria-label={`Selecionar ${c.number}`} /></td><td className="px-3 py-2.5"><Link href={`/contratos/${c.id}`} className="font-bold text-ds-primary hover:underline">{c.number}</Link> - {c.personName}</td><td className="px-3 py-2.5 text-center text-ds-text-muted">{String(c.billingDay).padStart(2, "0")}º</td><td className="px-3 py-2.5 text-right font-semibold">{money(c.total)}</td><td className="px-3 py-2.5 text-center">{c.billedInvoice ? <span className="rounded-full bg-[#DDF6EA] px-2 py-0.5 text-[11px] font-bold text-[#0B7A4B]">Faturado #{c.billedInvoice}</span> : <span className="rounded-full bg-[#FDF0DD] px-2 py-0.5 text-[11px] font-bold text-[#B45309]">A faturar</span>}</td></tr>)}</tbody></table></div>
            {rows.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ds-text-muted">{sel.size} selecionado(s) · <b className="text-ds-primary-deep">{money(total)}</b></p><button type="button" disabled={busy || sel.size === 0} onClick={() => { if (confirm(`Faturar ${sel.size} contrato(s) da competência ${String(month + 1).padStart(2, "0")}/${year}?`)) void invoice(); }} className={btnPrimary}>{busy ? "Faturando..." : "Faturar selecionados"}</button></div>}
          </div>
        )}
      </div>
      {done && (
        <Modal title="Faturamentos Realizados" onClose={() => setDone(null)}>
          <ul className="max-h-80 divide-y divide-ds-border-subtle overflow-y-auto">{done.length === 0 && <li className="py-6 text-center text-sm text-ds-text-secondary">Nenhum faturamento realizado.</li>}{done.map((i) => <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-sm"><Link href={`/faturamento/central/${i.id}`} className="min-w-0 truncate font-semibold text-ds-primary hover:underline">#{i.number} - {i.personName}</Link><span className="shrink-0 text-xs text-ds-text-secondary">{i.competence} · {dateBr(i.registeredAt)} · {money(i.total)}</span></li>)}</ul>
        </Modal>
      )}
    </div>
  );
}

export default function ContractsBillingPage() { return <PageShell permissionKey={FAT_KEYS.contratos}>{() => <Contracts />}</PageShell>; }
void label;
