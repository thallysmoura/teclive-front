"use client";

import { useRouter } from "next/navigation";
import { CADASTROS_KEYS, productsClient } from "@/lib/cadastros";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { ProductForm } from "@/components/cadastros/product-form";

export default function NewProductPage() {
  const router = useRouter();
  return (
    <PageShell permissionKey={CADASTROS_KEYS.produtos}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Administrativo" }, { label: "Produtos", href: "/cadastros/produtos" }, { label: "Novo Produto" }]} />
          <h1 className="mb-4 text-xl font-bold text-ds-primary-deep">Novo Produto</h1>
          <ProductForm submitLabel="Salvar Produto" onSubmit={async (input) => { await productsClient.create(input); router.push("/cadastros/produtos"); }} />
        </>
      )}
    </PageShell>
  );
}
