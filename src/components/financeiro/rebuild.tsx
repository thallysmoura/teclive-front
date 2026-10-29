"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/layout/page-shell";
import { Modal, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { money } from "@/lib/cadastros";
import { dateBr, fin, isoDay, num, type FinAccount, type Operation } from "@/lib/financeiro";

const TITLES = { AGRUPAMENTO: "Agrupamento de Contas", REPARCELAMENTO: "Reparcelamento de Contas", RENEGOCIACAO: "Renegociação de Contas a Receber" } as const;
const addMonths = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00`); d.setMonth(d.getMonth() + n); return isoDay(d); };

/** Assistente em 3 passos (seleção, novas contas, resumo) para agrupar, reparcelar ou renegociar contas a receber em aberto. */
export function Rebuild({ mode }: { mode: keyof typeof TITLES }) {
  const [step, setStep] = useState(0);
  const [person, setPerson] = useState("");
  const [accounts, setAccounts] = useState<FinAccount[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [count, setCount] = useState("1");
  const [first, setFirst] = useState(isoDay(new Date()));
  const [adjust, setAdjust] = useState("0,00");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [history, setHistory] = useState<Operation[] | null>(null);

  async function search() {
    setError("");
    try {
      const open = (await fin.accounts({ kind: "R", status: "ABERTA", person, page: 1 })).lista;
      const rows = mode === "RENEGOCIACAO" ? open.filter((a) => new Date(a.dueDate) < new Date()) : open;
      setAccounts(rows); setSel(new Set());
    } catch (e) { setError(e instanceof Error ? e.message : "Falha na busca."); }
  }
  const chosen = (accounts ?? []).filter((a) => sel.has(a.id));
  const base = chosen.reduce((s, a) => s + a.value, 0);
  const total = Math.round((base + num(adjust)) * 100) / 100;
  const n = mode === "AGRUPAMENTO" ? 1 : Math.max(1, Math.min(48, Number(count) || 1));
  const parts = Array.from({ length: n }, (_, i) => ({ dueDate: addMonths(first, i), value: i === n - 1 ? Math.round((total - Math.floor((total / n) * 100) / 100 * (n - 1)) * 100) / 100 : Math.floor((total / n) * 100) / 100 }));
  const names = new Set(chosen.map((a) => a.personName));

  function next() {
    setError("");
    if (step === 0) { if (!chosen.length) return setError("Selecione ao menos uma conta."); if (names.size > 1) return setError("As contas devem ser do mesmo cliente."); if (mode === "REPARCELAMENTO" && chosen.length !== 1) return setError("Selecione uma única conta para reparcelar."); }
    if (step === 1 && !(total > 0)) return setError("O total das novas contas deve ser maior que zero.");
    setStep(step + 1);
  }
  async function confirm() {
    setBusy(true); setError("");
    try { await fin.operate({ type: mode, accountIds: [...sel], parts, adjust: num(adjust) }); setDone(`${TITLES[mode]} concluído: ${parts.length} nova(s) conta(s) gerada(s).`); setStep(0); setAccounts(null); setSel(new Set()); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir."); } finally { setBusy(false); }
  }
  const steps = ["Seleção da Conta", "Novas Contas", "Resumo"];

  return (
    <div className="mx-auto max-w-[1000px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: TITLES[mode] }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">{TITLES[mode]}</h1><button type="button" onClick={() => void fin.operations().then(setHistory).catch(() => setHistory([]))} className={btnGhost}>Histórico de Operações</button></header>
      {done && <p role="status" className="mb-3 rounded-lg bg-[#DDF6EA] px-3 py-2 text-sm font-semibold text-[#0B7A4B]">{done}</p>}
      <ol className="mb-4 flex gap-2 text-sm">{steps.map((s, i) => <li key={s} className={`flex-1 rounded-lg border px-3 py-2 text-center font-semibold ${step === i ? "border-ds-primary bg-ds-primary/10 text-ds-primary-deep" : "border-ds-border-subtle text-ds-text-muted"}`}>{i + 1}. {s}</li>)}</ol>
      <div className={`${card} p-5`}>
        {step === 0 && (
          <div>
            <p className="mb-3 text-sm text-ds-text-secondary">{mode === "RENEGOCIACAO" ? "Informe o cliente para buscar contas vencidas que podem ser renegociadas." : "Informe o cliente para buscar as contas em aberto."}</p>
            <div className="mb-4 flex gap-2"><input value={person} onChange={(e) => setPerson(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} placeholder="Nome do cliente" className={field} /><button type="button" onClick={() => void search()} className={btnPrimary}>Buscar Contas</button></div>
            {accounts && <div className="overflow-x-auto rounded-xl border border-ds-border-subtle"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-ds-bg/60 text-xs text-ds-text-secondary"><tr><th className="w-10 px-3 py-2.5" /><th className="px-3 py-2.5 font-bold">Vencimento</th><th className="px-3 py-2.5 font-bold">Cliente / descrição</th><th className="px-3 py-2.5 text-right font-bold">Valor</th></tr></thead>
              <tbody>{accounts.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-ds-text-secondary">Nenhuma conta encontrada.</td></tr>}{accounts.map((a) => <tr key={a.id} className="border-t border-ds-border-subtle"><td className="px-3 py-2.5"><input type="checkbox" checked={sel.has(a.id)} onChange={(e) => setSel((s) => { const x = new Set(s); if (e.target.checked) x.add(a.id); else x.delete(a.id); return x; })} className="h-4 w-4 accent-[#005CD2]" aria-label={`Selecionar ${a.number}`} /></td><td className="px-3 py-2.5 text-ds-text-muted">{dateBr(a.dueDate)}</td><td className="px-3 py-2.5"><b className="text-ds-primary-deep">{a.personName}</b><span className="block text-xs text-ds-text-secondary">{a.number} - {a.description}</span></td><td className="px-3 py-2.5 text-right font-semibold">{money(a.value)}</td></tr>)}</tbody></table></div>}
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {mode !== "AGRUPAMENTO" && <label><span className={label}>Número de parcelas</span><input type="number" min={1} max={48} value={count} onChange={(e) => setCount(e.target.value)} className={field} /></label>}
            <label><span className={label}>1º vencimento</span><input type="date" value={first} onChange={(e) => setFirst(e.target.value)} className={field} /></label>
            {mode === "RENEGOCIACAO" && <label><span className={label}>Acréscimo (+) / desconto (−) em R$</span><input inputMode="decimal" value={adjust} onChange={(e) => setAdjust(e.target.value)} className={field} /></label>}
            <p className="sm:col-span-3 text-sm text-ds-text-muted">Valor original <b className="text-ds-primary-deep">{money(base)}</b> → novas contas <b className="text-ds-primary-deep">{money(total)}</b></p>
          </div>
        )}
        {step === 2 && (
          <div><p className="mb-3 text-sm text-ds-text-muted">Cliente <b className="text-ds-primary-deep">{[...names][0]}</b> · {chosen.length} conta(s) substituída(s) por {parts.length} nova(s):</p><ul className="divide-y divide-ds-border-subtle rounded-xl border border-ds-border-subtle">{parts.map((p, i) => <li key={i} className="flex justify-between px-4 py-2.5 text-sm"><span>{parts.length > 1 ? `Parcela ${i + 1}/${parts.length}` : "Conta única"} · vence em {dateBr(p.dueDate)}</span><b>{money(p.value)}</b></li>)}</ul></div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
        <div className="mt-5 flex gap-2">{step > 0 && <button type="button" onClick={() => setStep(step - 1)} className={btnGhost}>Voltar</button>}{step < 2 && <button type="button" onClick={next} className={btnPrimary}>Continuar →</button>}{step === 2 && <button type="button" disabled={busy} onClick={() => void confirm()} className={btnPrimary}>{busy ? "Processando..." : "Confirmar"}</button>}</div>
      </div>
      {history && <Modal title="Histórico de Operações" onClose={() => setHistory(null)}><ul className="max-h-80 divide-y divide-ds-border-subtle overflow-y-auto">{history.length === 0 && <li className="py-6 text-center text-sm text-ds-text-secondary">Nenhuma operação realizada.</li>}{history.map((h) => <li key={h.id} className="py-2 text-sm"><p className="font-semibold text-ds-primary-deep">{h.personName} <span className="font-normal text-ds-text-secondary">· {money(h.total)}</span></p><p className="text-xs text-ds-text-muted">{h.description}</p><p className="text-[11px] text-ds-text-secondary">{dateBr(h.createdAt)} · {h.userName}</p></li>)}</ul></Modal>}
    </div>
  );
}
