"use client";

import { COMERCIAL_KEYS, refusalClient, type RefusalReason } from "@/lib/comercial";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { RefusalForm } from "@/components/comercial/simple-forms";

const USED_WHEN = { CLIENT: "Recusado pelo cliente", MANAGEMENT: "Recusado pela gestão" } as const;

export default function RefusalReasonsPage() {
  return (
    <CrudList<RefusalReason>
      permissionKey={COMERCIAL_KEYS.motivos} title="Motivos de Recusa de Orçamento" group="Comercial" breadcrumb="Motivos de Recusa de Orçamento" basePath="/comercial/motivos-recusa" newLabel="Novo Motivo"
      searchPlaceholder="Pesquise pela descrição..." entityLabel="O motivo" defaultSort="description" api={refusalClient} rowName={(r) => r.description}
      creator={{ title: "Adicionando Motivo de Recusa de Orçamento", render: ({ onSaved, onCancel }) => (
        <RefusalForm submitLabel="Criar motivo de recusa" onCancel={onCancel} onSubmit={async (v) => { await refusalClient.create(v); onSaved(); }} />
      ) }}
      editor={{ title: "Editando Motivo de Recusa", render: ({ item, onSaved, onCancel }) => (
        <RefusalForm initial={item} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (v) => { await refusalClient.update(item.id, v); onSaved(); }} />
      ) }}
      columns={[
        { label: "Descrição", sortKey: "description", strong: true, render: (r) => r.description },
        { label: "Usado quando", sortKey: "usedWhen", render: (r) => USED_WHEN[r.usedWhen] },
        { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
      ]}
    />
  );
}
