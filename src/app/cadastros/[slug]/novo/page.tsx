"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { catalogClient } from "@/lib/cadastros";
import { CATALOGS } from "@/lib/catalog-config";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { CatalogForm } from "@/components/cadastros/catalog-form";

export default function NewCatalogItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const config = CATALOGS[slug];
  const api = useMemo(() => catalogClient(config?.kind ?? "brands"), [config]);
  if (!config) return <p className="p-8 text-sm text-ds-text-secondary">Cadastro não encontrado.</p>;
  return (
    <PageShell permissionKey={config.permissionKey}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Administrativo" }, { label: config.title, href: `/cadastros/${slug}` }, { label: `Adicionando ${config.singular}` }]} />
          <CatalogForm
            title={`Adicionando ${config.singular}`} help={config.help} fieldLabel={config.fieldLabel} submitLabel={config.createLabel} backHref={`/cadastros/${slug}`}
            onSubmit={async (description) => { await api.create({ description }); router.push(`/cadastros/${slug}`); }}
          />
        </>
      )}
    </PageShell>
  );
}
