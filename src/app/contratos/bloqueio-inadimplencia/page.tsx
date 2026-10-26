"use client";

import { useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Empty, Modal, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { BLOQUEIO_KEY, adminApi, dateBr } from "@/lib/contratos";

function Bloqueio() {
  const [days, setDays] = useState("7");
  const [method, setMethod] = useState("");
  const [result, setResult] = useState<unknown[] | null>(null);
  const [blocks, setBlocks] = useState<Awaited<ReturnType<typeof adminApi.blocks>> | null>(null);
  const [error, setError] = useState("");

  return (
    <div className="mx-auto max-w-[900px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Bloqueio por Inadimplência" }]} />
      <div className={`${card} p-6 md:p-8`}>
        <div className="mb-6 flex items-center gap-4 border-b border-ds-border-subtle pb-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DDF6EA] text-[#0B7A4B]"><Icon name="payments" className="text-[30px]" /></span>
          <div><h1 className="text-2xl font-extrabold text-ds-primary-deep">Bloqueio por Inadimplência</h1><p className="text-sm text-ds-text-secondary">Aqui você pode realizar o bloqueio de múltiplos clientes através de um único processo de forma prática e rápida.</p></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <label><span className="mb-1 block text-base font-bold text-ds-primary-deep">Quantos dias em atraso?</span><span className="mb-2 block text-xs text-ds-text-secondary">Busca os clientes que possuem duplicatas pendentes de pagamento com ao menos o número de dias de atraso informado.</span><input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className={field} /></label>
          <label><span className="mb-1 block text-base font-bold text-ds-primary-deep">Selecione uma forma de pagamento</span><span className="mb-2 block text-xs text-ds-text-secondary">Para visualizar somente contas pendentes desta forma.</span><select value={method} onChange={(e) => setMethod(e.target.value)} className={field}><option value="">Todas</option>{["A prazo", "À vista", "PIX", "Boleto", "Cartão de Crédito"].map((m) => <option key={m}>{m}</option>)}</select></label>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ds-border-subtle pt-5">
          <button type="button" onClick={() => { setError(""); void adminApi.searchDelinquency({ days: Number(days), method }).then(setResult).catch((e) => setError(e instanceof Error ? e.message : "Falha na busca.")); }} className={btnPrimary}>Buscar Clientes</button>
          <button type="button" onClick={() => void adminApi.blocks().then(setBlocks).catch(() => setBlocks([]))} className={`${btnGhost} gap-1.5`}><Icon name="history" className="text-[18px]" />Bloqueios Realizados</button>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-ds-danger-text">{error}</p>}
        {result && (
          <p className="mt-5 rounded-xl bg-ds-bg px-4 py-3 text-sm text-ds-text-muted">{result.length === 0 ? `Nenhum cliente com duplicatas pendentes há ${days} dia(s) ou mais. O controle de contas a receber ainda não foi migrado para o sistema.` : `${result.length} cliente(s) encontrado(s).`}</p>
        )}
      </div>
      {blocks && (
        <Modal title="Bloqueios Realizados" onClose={() => setBlocks(null)}>
          <table className="w-full text-left text-sm"><thead className="text-xs text-ds-text-secondary"><tr><th className="py-2 font-bold">Cliente</th><th className="py-2 font-bold">Atraso</th><th className="py-2 font-bold">Data / Usuário</th></tr></thead>
            <tbody>{blocks.length === 0 ? <Empty cols={3} loading={false} text="Nenhum bloqueio realizado." /> : blocks.map((b) => <tr key={b.id} className="border-t border-ds-border-subtle"><td className="py-2 font-semibold text-ds-primary-deep">{b.personName}</td><td className="py-2">{b.days} dias</td><td className="py-2 text-ds-text-muted">{dateBr(b.at)} · {b.userName}</td></tr>)}</tbody></table>
        </Modal>
      )}
    </div>
  );
}

export default function BloqueioPage() { return <PageShell permissionKey={BLOQUEIO_KEY}>{() => <Bloqueio />}</PageShell>; }
void label;
