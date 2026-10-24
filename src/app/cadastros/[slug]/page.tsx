"use client";

import { use, useMemo } from "react";
import { catalogClient, type CatalogItem } from "@/lib/cadastros";
import { CATALOGS } from "@/lib/catalog-config";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { CatalogInsights } from "@/components/cadastros/insights";
import { CatalogForm } from "@/components/cadastros/catalog-form";

export default function CatalogListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const config = CATALOGS[slug];
  const api = useMemo(() => catalogClient(config?.kind ?? "brands"), [config]);
  if (!config) return <p className="p-8 text-sm text-ds-text-secondary">Cadastro não encontrado.</p>;
  return (
    <CrudList<CatalogItem>
      permissionKey={config.permissionKey} title={config.title} breadcrumb={config.title} basePath={`/cadastros/${slug}`}
      newLabel={config.newLabel} searchPlaceholder={config.searchPlaceholder} entityLabel="O registro" defaultSort="description"
      header={<CatalogInsights kind={config.kind} noun={config.title} />}
      editor={{ title: `Editando ${config.singular}`, render: ({ item, onSaved, onCancel }) => (
        <CatalogForm embedded title={`Editando ${config.singular}`} help={config.help} fieldLabel={config.fieldLabel} initial={item.description} submitLabel="Salvar Alteração" backHref={`/cadastros/${slug}`} onCancel={onCancel} onSubmit={async (description) => { await api.update(item.id, { description }); onSaved(); }} />
      ) }} api={api} rowName={(r) => r.description}
      columns={[
        { label: "Descrição", sortKey: "description", strong: true, render: (r) => r.description },
        { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
      ]}
    />
  );
}
