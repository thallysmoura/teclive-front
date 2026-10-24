"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { catalogClient, type CatalogItem } from "@/lib/cadastros";
import { CATALOGS } from "@/lib/catalog-config";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { CatalogForm } from "@/components/cadastros/catalog-form";

export default function EditCatalogItemPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const router = useRouter();
  const config = CATALOGS[slug];
  const api = useMemo(() => catalogClient(config?.kind ?? "brands"), [config]);
  const [item, setItem] = useState<CatalogItem | null | undefined>(undefined);
  useEffect(() => { if (config) api.get(id).then(setItem).catch(() => setItem(null)); }, [api, id, config]);
  if (!config) return <p className="p-8 text-sm text-ds-text-secondary">Cadastro não encontrado.</p>;
  return (
    <PageShell permissionKey={config.permissionKey}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Administrativo" }, { label: config.title, href: `/cadastros/${slug}` }, { label: `Editando ${config.singular}` }]} />
          {item === null ? <p className="text-sm text-ds-text-secondary">Registro não encontrado.</p> : item && (
            <CatalogForm
              title={`Editando ${config.singular}`} help={config.help} fieldLabel={config.fieldLabel} initial={item.description} submitLabel="Salvar Alteração" backHref={`/cadastros/${slug}`}
              onSubmit={async (description) => { await api.update(id, { description }); router.push(`/cadastros/${slug}`); }}
            />
          )}
        </>
      )}
    </PageShell>
  );
}
