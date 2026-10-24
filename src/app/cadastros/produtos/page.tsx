"use client";

import { CADASTROS_KEYS, money, productsClient, type Product } from "@/lib/cadastros";
import { useEffect, useState } from "react";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { ProductInsights } from "@/components/cadastros/insights";
import { ProductForm } from "@/components/cadastros/product-form";
import { catalogNames } from "@/lib/cadastros";

export default function ProductsPage() {
  const [brands, setBrands] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  useEffect(() => {
    catalogNames("brands").then(setBrands).catch(() => {});
    catalogNames("product-groups").then(setGroups).catch(() => {});
  }, []);
  return (
    <CrudList<Product>
      permissionKey={CADASTROS_KEYS.produtos} title="Produtos" breadcrumb="Produtos" basePath="/cadastros/produtos" newLabel="Novo Produto"
      searchPlaceholder="Pesquisar pela descrição, identificador ou código do fornecedor..." entityLabel="O produto" defaultSort="recent" api={productsClient} rowName={(r) => r.description}
      header={<ProductInsights />}
      editor={{ title: "Editando Produto", wide: true, render: ({ item, onSaved, onCancel }) => (
        <ProductForm embedded initial={item} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (input) => { await productsClient.update(item.id, input); onSaved(); }} />
      ) }}
      filterPanel={{
        inactiveLabel: "Exibir produtos inativos",
        render: (draft, set) => (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ds-text-secondary">Marca</span>
              <select value={draft.type} onChange={(e) => set({ type: e.target.value })} className="h-11 rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary">
                <option value="">Todas</option>{brands.map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ds-text-secondary">Grupo de Produtos</span>
              <select value={draft.role} onChange={(e) => set({ role: e.target.value })} className="h-11 rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary">
                <option value="">Todos</option>{groups.map((g) => <option key={g}>{g}</option>)}
              </select>
            </label>
          </div>
        ),
      }}
      columns={[
        { label: "Descrição", sortKey: "description", strong: true, render: (r) => (<>{r.description}<span className="block text-xs font-normal text-ds-text-secondary">{r.brand} · {r.productGroup}</span></>) },
        { label: "Identificador", render: (r) => r.identifier || "—" },
        { label: "Preço de venda", sortKey: "salePrice", className: "md:text-right", render: (r) => money(r.salePrice) },
        { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
      ]}
    />
  );
}
