"use client";

import { OPERACIONAL_KEYS, solutionClient, type OpSolution } from "@/lib/operacional";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { DescriptionForm } from "@/components/operacional/lookup-forms";

export default function SolutionsPage() {
  return (
    <CrudList<OpSolution>
      permissionKey={OPERACIONAL_KEYS.solucoes} title="Soluções" group="Operacional" breadcrumb="Soluções" basePath="/operacional/solucoes" newLabel="Nova Solução"
      searchPlaceholder="Pesquise pela descrição da solução..." entityLabel="A solução" defaultSort="description" api={solutionClient} rowName={(r) => r.description}
      creator={{ title: "Adicionando Solução", render: ({ onSaved, onCancel }) => (
        <DescriptionForm label="Descrição" submitLabel="Criar solução" onCancel={onCancel} onSubmit={async (v) => { await solutionClient.create(v); onSaved(); }} />
      ) }}
      editor={{ title: "Editando Solução", render: ({ item, onSaved, onCancel }) => (
        <DescriptionForm label="Descrição" initial={item} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (v) => { await solutionClient.update(item.id, v); onSaved(); }} />
      ) }}
      columns={[
        { label: "Descrição", sortKey: "description", strong: true, render: (r) => r.description },
        { label: "Em uso", render: (r) => `${r.timesUsed} OS` },
        { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
      ]}
    />
  );
}
