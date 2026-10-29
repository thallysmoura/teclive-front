"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Rebuild } from "@/components/financeiro/rebuild";
import { btnGhost, btnPrimary, card } from "@/components/contratos/admin-ui";
import { FIN_KEYS } from "@/lib/financeiro";

function Choose() {
  const [mode, setMode] = useState<"AGRUPAMENTO" | "REPARCELAMENTO" | null>(null);
  if (mode) return <div><button type="button" onClick={() => setMode(null)} className={`${btnGhost} mb-4`}>← Voltar</button><Rebuild mode={mode} /></div>;
  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-ds-primary-deep">Agrupamento e Reparcelamento</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <section className={`${card} p-6`}><h2 className="text-lg font-bold text-ds-primary-deep">Agrupamento de Contas</h2><p className="my-3 text-sm text-ds-text-secondary">Agrupa diversas contas de um cliente em apenas uma parcela, para possibilitar a emissão única de um documento de cobrança.</p><button type="button" onClick={() => setMode("AGRUPAMENTO")} className={btnPrimary}>Agrupar</button></section>
        <section className={`${card} p-6`}><h2 className="text-lg font-bold text-ds-primary-deep">Reparcelamento de Contas</h2><p className="my-3 text-sm text-ds-text-secondary">Reparcele uma duplicata em diversas outras, sendo que cada uma das novas contas terá o seu próprio vencimento.</p><button type="button" onClick={() => setMode("REPARCELAMENTO")} className={btnPrimary}>Reparcelar</button></section>
      </div>
    </div>
  );
}

export default function RepartPage() { return <PageShell permissionKey={FIN_KEYS.reparcelamento}>{() => <Choose />}</PageShell>; }
