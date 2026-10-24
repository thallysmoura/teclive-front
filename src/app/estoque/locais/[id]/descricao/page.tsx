"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStockLocation, renameStockLocation, type StockLocation } from "@/lib/api";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { LocationForm } from "@/components/stock/location-form";

const KEY = "item_b2681b6f-1f50-4d5b-b28a-98b27905e6ad";

export default function EditStockLocationDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [location, setLocation] = useState<StockLocation | null | undefined>(undefined);
  useEffect(() => { getStockLocation(id).then(setLocation).catch(() => setLocation(null)); }, [id]);

  return (
    <PageShell permissionKey={KEY}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Locais de Estoque", href: "/estoque/locais" }, { label: "Detalhes do local de estoque", href: `/estoque/locais/${id}` }, { label: "Descrição do Local de Estoque" }]} />
          {location === null ? <p className="text-sm text-ds-text-secondary">Local de estoque não encontrado.</p> : location && (
            <LocationForm
              title="Descrição do Local de Estoque" initial={location.description} submitLabel="Salvar Alteração" backHref={`/estoque/locais/${id}`} backLabel="voltar aos detalhes"
              onSubmit={async (description) => { await renameStockLocation(id, description); router.push(`/estoque/locais/${id}`); }}
            />
          )}
        </>
      )}
    </PageShell>
  );
}
