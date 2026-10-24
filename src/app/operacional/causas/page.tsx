"use client";

import { OPERACIONAL_KEYS, causeClient, type OpCause } from "@/lib/operacional";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { DescriptionForm } from "@/components/operacional/lookup-forms";

export default function CausesPage() {
  return (
    <CrudList<OpCause>
      permissionKey={OPERACIONAL_KEYS.causas} title="Causas" group="Operacional" breadcrumb="Causas" basePath="/operacional/causas" newLabel="Nova Causa"
      searchPlaceholder="Pesquise pela descrição da causa..." entityLabel="A causa" defaultSort="description" api={causeClient} rowName={(r) => r.description}
      creator={{ title: "Adicionando Causa", render: ({ onSaved, onCancel }) => (
        <DescriptionForm label="Descrição" submitLabel="Criar causa" onCancel={onCancel} onSubmit={async (v) => { await causeClient.create(v); onSaved(); }} />
      ) }}
      editor={{ title: "Editando Causa", render: ({ item, onSaved, onCancel }) => (
        <DescriptionForm label="Descrição" initial={item} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (v) => { await causeClient.update(item.id, v); onSaved(); }} />
      ) }}
      columns={[
        { label: "Descrição", sortKey: "description", strong: true, render: (r) => r.description },
        { label: "Em uso", render: (r) => `${r.timesUsed} OS` },
        { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
      ]}
    />
  );
}
