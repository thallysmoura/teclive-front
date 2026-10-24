"use client";

import { useState } from "react";
import { COMERCIAL_KEYS, salesActionsClient, type SalesAction } from "@/lib/comercial";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { SalesActionForm } from "@/components/comercial/simple-forms";
import { SalesActionInsights } from "@/components/comercial/insights";

export default function SalesActionsPage() {
  // "Salvar e agendar próxima ação" reabre o formulário limpo depois de salvar.
  const [round, setRound] = useState(0);
  return (
    <CrudList<SalesAction>
      key={round} permissionKey={COMERCIAL_KEYS.acoes} title="Ações de Venda" group="Comercial" breadcrumb="Ações de Venda" basePath="/comercial/acoes-venda" newLabel="Nova Ação de Venda"
      searchPlaceholder="Pesquisar..." entityLabel="A ação de venda" defaultSort="recent" api={salesActionsClient} rowName={(r) => r.title} dateRange
      header={<SalesActionInsights />}
      creator={{ title: "Nova Ação de Venda", wide: true, render: ({ onSaved, onCancel }) => (
        <SalesActionForm allowNext submitLabel="Salvar Ação" onCancel={onCancel} onSubmit={async (v, next) => { await salesActionsClient.create(v); if (next) setRound((r) => r + 1); else onSaved(); }} />
      ) }}
      editor={{ title: "Editando Ação de Venda", wide: true, render: ({ item, onSaved, onCancel }) => (
        <SalesActionForm initial={item} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (v) => { await salesActionsClient.update(item.id, v); onSaved(); }} />
      ) }}
      columns={[
        { label: "Ação de Venda", sortKey: "title", strong: true, render: (r) => (<>{r.title}<span className="block text-xs font-normal text-ds-text-secondary">{r.personName} · {r.channel}</span></>) },
        { label: "Data da Ação", sortKey: "actionDate", className: "md:text-right", render: (r) => new Date(r.actionDate).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) },
        { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
      ]}
    />
  );
}
