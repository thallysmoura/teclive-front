"use client";

import { COMERCIAL_KEYS, quoteModelsClient, type QuoteModel } from "@/lib/comercial";
import { CrudList } from "@/components/cadastros/crud-list";
import { ModelForm } from "@/components/comercial/simple-forms";

export default function QuoteModelsPage() {
  return (
    <CrudList<QuoteModel>
      permissionKey={COMERCIAL_KEYS.modelos} title="Modelos de Orçamento" group="Comercial" breadcrumb="Modelos de Orçamentos" basePath="/comercial/modelos" newLabel="Novo Modelo"
      searchPlaceholder="Pesquisar..." entityLabel="O modelo" defaultSort="description" api={quoteModelsClient} rowName={(r) => r.description} hideInactivate hideInactiveToggle
      creator={{ title: "Novo Modelo de Orçamento", render: ({ onSaved, onCancel }) => (
        <ModelForm submitLabel="Salvar Modelo" onCancel={onCancel} onSubmit={async (description) => { await quoteModelsClient.create({ description }); onSaved(); }} />
      ) }}
      editor={{ title: "Editando Modelo de Orçamento", render: ({ item, onSaved, onCancel }) => (
        <ModelForm initial={item.description} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (description) => { await quoteModelsClient.update(item.id, { description }); onSaved(); }} />
      ) }}
      columns={[{ label: "Descrição", sortKey: "description", strong: true, render: (r) => r.description }]}
    />
  );
}
