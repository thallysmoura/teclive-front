"use client";

import { useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Empty, Pill, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { ADJUST_INDEXES, REAJUSTE_KEY, adminApi, dateBr, fmtDoc, type Adjustment, type Eligible } from "@/lib/contratos";
import { money } from "@/lib/cadastros";

function Adjustments() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<Adjustment[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (!creating) void adminApi.adjustments(term).then(setRows).catch(() => setRows([])); }, [term, creating]);
  if (creating) return <NewAdjustment onBack={() => setCreating(false)} />;

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Listagem de Reajustes" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Listagem de Reajustes de Contrato</h1>
        <button type="button" onClick={() => setCreating(true)} className={btnPrimary}>Novo Reajuste</button>
      </header>
      <form onSubmit={(e) => { e.preventDefault(); setTerm(q); }} className={`${card} mb-4 flex gap-3 p-3`}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquise por identificador, nome do cliente ..." className={`${field} flex-1`} />
        <button type="submit" className={btnPrimary}>Pesquisar</button>
        <button type="button" onClick={() => { setQ(""); setTerm(""); }} className={btnGhost}>Limpar</button>
      </form>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th className="px-5 py-3 font-bold">Data Reajuste<span className="block font-normal">Usuário</span></th><th className="px-3 py-3 font-bold">Tipo data Filtro<span className="block font-normal">Período</span></th><th className="px-3 py-3 font-bold">Índice de Reajuste<span className="block font-normal">Grupo de Contrato</span></th><th className="px-3 py-3 text-right font-bold">Valor Selecionado</th><th className="px-3 py-3 text-right font-bold">Valor Reajustado</th><th className="px-5 py-3 text-center font-bold">Status</th></tr></thead>
          <tbody>
            {!rows || rows.length === 0 ? <Empty cols={6} loading={!rows} text="Nenhum Reajuste para Exibir" /> : rows.map((a) => (
              <tr key={a.id} className="border-t border-ds-border-subtle">
                <td className="px-5 py-3 font-semibold text-ds-primary-deep">{dateBr(a.at)}<span className="block text-xs font-normal text-ds-text-secondary">{a.userName}</span></td>
                <td className="px-3 py-3 text-ds-text-muted">{a.filterType}<span className="block text-xs text-ds-text-secondary">{a.months} meses</span></td>
                <td className="px-3 py-3 text-ds-text-muted">{a.indexId ? ADJUST_INDEXES[a.indexId]?.split(" - ")[0] : "Todos"} · {a.percent}%<span className="block text-xs text-ds-text-secondary">{a.groupName ?? "Todos"}</span></td>
                <td className="px-3 py-3 text-right text-ds-text-muted">{money(a.valueBefore)}</td><td className="px-3 py-3 text-right font-bold text-ds-primary-deep">{money(a.valueAfter)}</td>
                <td className="px-5 py-3 text-center"><Pill ok={!a.canceledAt} on="Aplicado" off="Cancelado" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ds-text-secondary">{rows?.length ?? 0} registros</p>
    </div>
  );
}

function NewAdjustment({ onBack }: { onBack: () => void }) {
  const [months, setMonths] = useState("12");
  const [group, setGroup] = useState("");
  const [index, setIndex] = useState("");
  const [skip, setSkip] = useState(true);
  const [round, setRound] = useState(false);
  const [percent, setPercent] = useState("");
  const [groups, setGroups] = useState<{ id: string; description: string }[]>([]);
  const [found, setFound] = useState<Eligible[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void adminApi.groups().then(setGroups).catch(() => undefined); }, []);
  const filter = () => ({ months: Number(months) || 0, groupId: group || undefined, index: index ? Number(index) : undefined, skipAdjusted: skip });

  async function search() {
    setError("");
    try { const r = await adminApi.searchAdjust(filter()); setFound(r); setSel(new Set(r.map((c) => c.id))); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível pesquisar."); }
  }
  async function apply() {
    setError("");
    const p = Number(percent.replace(",", "."));
    if (!(p > 0)) return setError("Informe o percentual de reajuste.");
    if (!confirm(`Aplicar ${p}% em ${sel.size} contrato(s)?`)) return;
    setBusy(true);
    try { await adminApi.applyAdjust({ ...filter(), percent: p, round, contractIds: [...sel] }); onBack(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível aplicar."); setBusy(false); }
  }
  const total = found?.filter((c) => sel.has(c.id)).reduce((s, c) => s + c.totalNet, 0) ?? 0;

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Listagem de Reajustes" }, { label: "Novo Reajuste de Contratos" }]} />
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-ds-primary-deep">Novo Reajuste de Contratos</h1>
      <div className={`${card} p-5 md:p-7`}>
        <h2 className="mb-3 text-lg font-extrabold text-ds-primary-deep">Dados Básicos</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label><span className={label}>Buscar Por</span><select className={field} disabled><option>Contratos iniciados a mais de</option></select></label>
          <label><span className={label}>Meses</span><input type="number" min={0} value={months} onChange={(e) => setMonths(e.target.value)} className={field} /></label>
          <label className="flex items-end gap-2 pb-3 text-sm text-ds-text-muted"><input type="checkbox" checked={round} onChange={(e) => setRound(e.target.checked)} className="h-4 w-4 accent-[#005CD2]" />Aplicar arredondamento (valores inteiros)</label>
          <label><span className={label}>Grupo de Faturamento</span><select value={group} onChange={(e) => setGroup(e.target.value)} className={field}><option value="">- Todos -</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.description}</option>)}</select></label>
          <label><span className={label}>Índice de Reajuste</span><select value={index} onChange={(e) => setIndex(e.target.value)} className={field}><option value="">- Todos -</option>{Object.entries(ADJUST_INDEXES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="flex items-end gap-2 pb-3 text-sm text-ds-text-muted"><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} className="h-4 w-4 accent-[#005CD2]" />Sim, ignorar já reajustados (últimos 12 meses).</label>
        </div>
        <div className="mt-4"><button type="button" onClick={() => void search()} className={btnPrimary}>Pesquisar</button></div>

        {found && (
          <div className="mt-6 border-t border-ds-border-subtle pt-5">
            <div className="overflow-x-auto rounded-xl border border-ds-border-subtle">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-ds-bg/60 text-xs text-ds-text-secondary"><tr><th className="w-10 px-3 py-2.5"><input type="checkbox" checked={sel.size === found.length && found.length > 0} onChange={(e) => setSel(e.target.checked ? new Set(found.map((c) => c.id)) : new Set())} className="h-4 w-4 accent-[#005CD2]" aria-label="Selecionar todos" /></th><th className="px-3 py-2.5 font-bold">Contrato</th><th className="px-3 py-2.5 font-bold">Início</th><th className="px-3 py-2.5 text-right font-bold">Valor atual</th></tr></thead>
                <tbody>
                  {found.length === 0 && <Empty cols={4} loading={false} text="Nenhum contrato elegível para reajuste." />}
                  {found.map((c) => <tr key={c.id} className="border-t border-ds-border-subtle"><td className="px-3 py-2.5"><input type="checkbox" checked={sel.has(c.id)} onChange={(e) => setSel((s) => { const n = new Set(s); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n; })} className="h-4 w-4 accent-[#005CD2]" /></td><td className="px-3 py-2.5"><span className="font-bold text-ds-primary">{c.number}</span> - {c.personName}</td><td className="px-3 py-2.5 text-ds-text-muted">{dateBr(c.startDate)}</td><td className="px-3 py-2.5 text-right font-semibold">{money(c.totalNet)}</td></tr>)}
                </tbody>
              </table>
            </div>
            {found.length > 0 && (
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <label className="w-40"><span className={label}>Percentual (%) *</span><input inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="Ex.: 4,5" className={field} /></label>
                <p className="pb-3 text-sm text-ds-text-muted">{sel.size} selecionado(s) · {money(total)}{Number(percent.replace(",", ".")) > 0 ? ` → ${money(total * (1 + Number(percent.replace(",", ".")) / 100))}` : ""}</p>
                <button type="button" disabled={busy || sel.size === 0} onClick={() => void apply()} className={btnPrimary}>{busy ? "Aplicando..." : "Aplicar Reajuste"}</button>
              </div>
            )}
          </div>
        )}
        {error && <p role="alert" className="mt-4 text-sm font-medium text-ds-danger-text">{error}</p>}
        <div className="mt-6 border-t border-ds-border-subtle pt-4"><button type="button" onClick={onBack} className="text-sm font-bold text-ds-primary hover:underline">Voltar à listagem</button></div>
      </div>
    </div>
  );
}

export default function AdjustmentsPage() { return <PageShell permissionKey={REAJUSTE_KEY}>{() => <Adjustments />}</PageShell>; }
void fmtDoc;
