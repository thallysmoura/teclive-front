"use client";

import { useState } from "react";
import { COMERCIAL_KEYS, templatesClient, type QuoteTemplate } from "@/lib/comercial";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { ModelForm } from "@/components/comercial/simple-forms";
import { TemplateUploadForm, VariablesModal } from "@/components/comercial/template-form";

export default function QuoteTemplatesPage() {
  const [variables, setVariables] = useState(false);
  return (
    <>
      <CrudList<QuoteTemplate>
        permissionKey={COMERCIAL_KEYS.templates} title="Templates de Orçamento" group="Comercial" breadcrumb="Templates de Orçamentos" basePath="/comercial/templates" newLabel="Novo Template"
        searchPlaceholder="Pesquise pela descrição" entityLabel="O template" defaultSort="description" api={templatesClient} rowName={(r) => r.description}
        headerActions={<button type="button" onClick={() => setVariables(true)} className="inline-flex h-11 items-center rounded-[10px] border border-ds-primary-deep px-4 text-sm font-bold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white">Variáveis</button>}
        creator={{ title: "Novo Template para Orçamentos", render: ({ onSaved, onCancel }) => (
          <TemplateUploadForm onCancel={onCancel} onSubmit={async (description, file) => { await templatesClient.upload(description, file); onSaved(); }} />
        ) }}
        editor={{ title: "Editando Template", render: ({ item, onSaved, onCancel }) => (
          <ModelForm initial={item.description} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (description) => { await templatesClient.update(item.id, { description }); onSaved(); }} />
        ) }}
        extraMenu={[{ label: "Baixar arquivo", icon: "download", onClick: (row) => templatesClient.download(row) }]}
        columns={[
          { label: "Descrição", sortKey: "description", strong: true, render: (r) => (<>{r.description}<span className="block text-xs font-normal text-ds-text-secondary">{r.fileName}</span></>) },
          { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
        ]}
      />
      <VariablesModal open={variables} onClose={() => setVariables(false)} />
    </>
  );
}
