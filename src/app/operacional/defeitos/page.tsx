"use client";

import { OPERACIONAL_KEYS, defectClient, formatMinutes, type OpDefect } from "@/lib/operacional";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { DefectForm } from "@/components/operacional/lookup-forms";

export default function DefectsPage() {
  return (
    <CrudList<OpDefect>
      permissionKey={OPERACIONAL_KEYS.defeitos} title="Defeitos" group="Operacional" breadcrumb="Defeitos" basePath="/operacional/defeitos" newLabel="Novo Defeito"
      searchPlaceholder="Pesquise pela descrição do defeito..." entityLabel="O defeito" defaultSort="description" api={defectClient} rowName={(r) => r.description}
      creator={{ title: "Adicionando Defeito", render: ({ onSaved, onCancel }) => (
        <DefectForm submitLabel="Criar defeito" onCancel={onCancel} onSubmit={async (v) => { await defectClient.create(v); onSaved(); }} />
      ) }}
      editor={{ title: "Editando Defeito", render: ({ item, onSaved, onCancel }) => (
        <DefectForm initial={item} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (v) => { await defectClient.update(item.id, v); onSaved(); }} />
      ) }}
      columns={[
        { label: "Descrição", sortKey: "description", strong: true, render: (r) => r.description },
        { label: "Prazo de atendimento", sortKey: "serviceMinutes", render: (r) => formatMinutes(r.serviceMinutes) },
        { label: "Previsão de fechamento", sortKey: "closingMinutes", render: (r) => formatMinutes(r.closingMinutes) },
        { label: "Em uso", render: (r) => `${r.timesUsed} OS` },
        { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
      ]}
    />
  );
}
