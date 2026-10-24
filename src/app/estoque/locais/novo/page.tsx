"use client";

import { useRouter } from "next/navigation";
import { createStockLocation } from "@/lib/api";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { LocationForm } from "@/components/stock/location-form";

const KEY = "item_b2681b6f-1f50-4d5b-b28a-98b27905e6ad";

export default function NewStockLocationPage() {
  const router = useRouter();
  return (
    <PageShell permissionKey={KEY}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Locais de Estoque", href: "/estoque/locais" }, { label: "Adicionando local de estoque" }]} />
          <LocationForm
            title="Adicionando Local de Estoque" submitLabel="Criar local de estoque" backHref="/estoque/locais" backLabel="voltar à listagem"
            onSubmit={async (description) => { await createStockLocation(description); router.push("/estoque/locais"); }}
          />
        </>
      )}
    </PageShell>
  );
}
