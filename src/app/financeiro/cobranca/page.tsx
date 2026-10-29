"use client";

import { useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Empty, Modal, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { money } from "@/lib/cadastros";
import { FIN_KEYS, dateBr, fin, type Debtor } from "@/lib/financeiro";

function Collection() {
  const [days, setDays] = useState("0");
  const [person, setPerson] = useState("");
  const [without, setWithout] = useState("");
  const [method, setMethod] = useState("");
  const [rows, setRows] = useState<Debtor[] | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Awaited<ReturnType<typeof fin.collections>> | null>(null);
  const [dlg, setDlg] = useState<Debtor | null>(null);
  const [note, setNote] = useState("");

  async function search() { setError(""); try { setRows(await fin.collectionSearch({ daysLate: Number(days) || 0, person, daysWithout: without, method })); } catch (e) { setError(e instanceof Error ? e.message : "Falha na busca."); } }
  async function register() {
    if (!dlg) return;
    try { await fin.collect({ personName: dlg.personName, note, total: dlg.total }); setDlg(null); setNote(""); await search(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível registrar."); }
  }
  return (
    <div className="mx-auto max-w-[1000px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Cobranças" }]} />
      <div className={`${card} p-6 md:p-8`}>
        <h1 className="text-2xl font-extrabold text-ds-primary-deep">Processo de Cobrança</h1>
        <p className="mb-5 border-b border-ds-border-subtle pb-4 text-sm text-ds-text-secondary">Aqui você pode realizar a cobrança de clientes e notificá-los sobre pendências de forma prática e rápida.</p>
        <div className="grid gap-6 md:grid-cols-2">
          <label><span className="font-bold text-ds-primary-deep">Quantos dias em atraso?</span><span className="mb-2 block text-xs text-ds-text-secondary">Busca os clientes com duplicatas pendentes há ao menos esse número de dias. Com 0, traz também as contas que vencem até hoje.</span><input type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} className={field} /></label>
          <label><span className="font-bold text-ds-primary-deep">Selecione um cliente</span><span className="mb-2 block text-xs text-ds-text-secondary">Deixe em branco para buscar todos os clientes.</span><input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Nome do cliente" className={field} /></label>
          <label><span className="font-bold text-ds-primary-deep">Quantos dias sem cobrança?</span><span className="mb-2 block text-xs text-ds-text-secondary">Clientes sem cobrança há mais que esta quantidade de dias.</span><input type="number" min={0} value={without} onChange={(e) => setWithout(e.target.value)} className={field} /></label>
          <label><span className="font-bold text-ds-primary-deep">Selecione uma forma de pagamento</span><span className="mb-2 block text-xs text-ds-text-secondary">Para ver somente contas pendentes desta forma.</span><select value={method} onChange={(e) => setMethod(e.target.value)} className={field}><option value="">Todas</option>{["A prazo", "À vista", "Crédito em Fornecedor", "PIX", "Boleto", "Cartão de Crédito (VISA / MASTER)", "Cartão de Crédito (AMEX)", "Boleto Inter"].map((m) => <option key={m}>{m}</option>)}</select></label>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ds-border-subtle pt-5"><button type="button" onClick={() => void search()} className={btnPrimary}>Buscar Clientes</button><button type="button" onClick={() => void fin.collections().then(setHistory).catch(() => setHistory([]))} className={btnGhost}>Cobranças Realizadas</button></div>
        {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
        {rows && (
          <div className="mt-5 overflow-x-auto rounded-xl border border-ds-border-subtle"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-ds-bg/60 text-xs text-ds-text-secondary"><tr><th className="px-4 py-2.5 font-bold">Cliente</th><th className="px-3 py-2.5 text-center font-bold">Contas</th><th className="px-3 py-2.5 text-center font-bold">Dias em atraso</th><th className="px-3 py-2.5 text-right font-bold">Valor</th><th className="px-3 py-2.5 font-bold">Última cobrança</th><th className="px-3 py-2.5 text-center font-bold">Ações</th></tr></thead>
            <tbody>{rows.length === 0 && <Empty cols={6} loading={false} text="Nenhum cliente encontrado para os filtros." />}{rows.map((r) => <tr key={r.personName} className="border-t border-ds-border-subtle"><td className="px-4 py-2.5 font-semibold text-ds-primary-deep">{r.personName}</td><td className="px-3 py-2.5 text-center">{r.count}</td><td className="px-3 py-2.5 text-center"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.daysLate > 0 ? "bg-[#FDE6E4] text-[#B42318]" : "bg-[#FDF0DD] text-[#B45309]"}`}>{r.daysLate}</span></td><td className="px-3 py-2.5 text-right font-semibold">{money(r.total)}</td><td className="px-3 py-2.5 text-ds-text-muted">{r.lastCollection ? dateBr(r.lastCollection) : "-"}</td><td className="px-3 py-2.5 text-center"><button type="button" onClick={() => setDlg(r)} className="text-xs font-bold text-ds-primary hover:underline">Registrar cobrança</button></td></tr>)}</tbody></table></div>
        )}
      </div>
      {dlg && <Modal title={`Cobrança - ${dlg.personName}`} onClose={() => setDlg(null)}><p className="mb-3 text-sm text-ds-text-muted">{dlg.count} conta(s), {money(dlg.total)}.</p><label><span className={label}>Observação</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="Ex.: contato por WhatsApp, promessa de pagamento para sexta" className="w-full resize-y rounded-[10px] border border-ds-border px-3 py-2 text-sm outline-none focus:border-ds-primary" /></label><div className="mt-4 flex gap-2"><button type="button" className={btnPrimary} onClick={() => void register()}>Registrar</button><button type="button" className={btnGhost} onClick={() => setDlg(null)}>Cancelar</button></div></Modal>}
      {history && <Modal title="Cobranças Realizadas" onClose={() => setHistory(null)}><ul className="max-h-80 divide-y divide-ds-border-subtle overflow-y-auto">{history.length === 0 && <li className="py-6 text-center text-sm text-ds-text-secondary">Nenhuma cobrança registrada.</li>}{history.map((h) => <li key={h.id} className="py-2 text-sm"><p className="font-semibold text-ds-primary-deep">{h.personName} <span className="font-normal text-ds-text-secondary">· {money(h.total)}</span></p><p className="text-xs text-ds-text-muted">{h.note}</p><p className="text-[11px] text-ds-text-secondary">{dateBr(h.createdAt)} · {h.userName}</p></li>)}</ul></Modal>}
    </div>
  );
}

export default function CollectionPage() { return <PageShell permissionKey={FIN_KEYS.cobranca}>{() => <Collection />}</PageShell>; }
