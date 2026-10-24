"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CADASTROS_KEYS, productsClient, type Product } from "@/lib/cadastros";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { ProductForm } from "@/components/cadastros/product-form";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<Product | null | undefined>(undefined);
  useEffect(() => { productsClient.get(id).then(setItem).catch(() => setItem(null)); }, [id]);
  return (
    <PageShell permissionKey={CADASTROS_KEYS.produtos}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Administrativo" }, { label: "Produtos", href: "/cadastros/produtos" }, { label: "Editando Produto" }]} />
          <h1 className="mb-4 text-xl font-bold text-ds-primary-deep">Editando Produto</h1>
          {item === null ? <p className="text-sm text-ds-text-secondary">Produto não encontrado.</p> : item && (
            <ProductForm initial={item} submitLabel="Salvar Alteração" onSubmit={async (input) => { await productsClient.update(id, input); router.push("/cadastros/produtos"); }} />
          )}
        </>
      )}
    </PageShell>
  );
}
