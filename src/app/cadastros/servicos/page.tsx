"use client";

import { CADASTROS_KEYS, money, servicesClient, type ServiceItem } from "@/lib/cadastros";
import { useEffect, useState } from "react";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { ServiceInsights, ServiceSummary } from "@/components/cadastros/insights";
import { ServiceForm } from "@/components/cadastros/service-form";

export default function ServicesPage() {
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => { servicesClient.categories().then(setCategories).catch(() => {}); }, []);
  return (
    <CrudList<ServiceItem>
      permissionKey={CADASTROS_KEYS.servicos} title="Serviços" breadcrumb="Serviços" basePath="/cadastros/servicos" newLabel="Novo Serviço"
      searchPlaceholder="Pesquisar..." entityLabel="O serviço" defaultSort="recent" api={servicesClient} rowName={(r) => r.description}
      header={<ServiceInsights />}
      editor={{ title: "Editando Serviço", wide: true, render: ({ item, onSaved, onCancel }) => (
        <>
          <ServiceSummary service={item} />
          <ServiceForm embedded initial={item} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (input) => { await servicesClient.update(item.id, input); onSaved(); }} />
        </>
      ) }}
      filterPanel={{
        inactiveLabel: "Exibir serviços inativos",
        render: (draft, set) => (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ds-text-secondary">Serviço para</span>
              <div className="inline-flex self-start overflow-hidden rounded-lg border border-ds-primary-deep">
                {([["", "Todos"], ["2", "Contratos"], ["1", "Ordens de Serviço"]] as const).map(([value, label]) => (
                  <button key={label} type="button" onClick={() => set({ type: value })} className={`px-3 py-1.5 text-sm font-semibold ${draft.type === value ? "bg-ds-primary-deep text-white" : "bg-white text-ds-primary-deep"}`}>{label}</button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ds-text-secondary">Categoria da Receita</span>
              <select value={draft.role} onChange={(e) => set({ role: e.target.value })} className="h-11 rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary">
                <option value="">Todas</option>{categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
        ),
      }}
      columns={[
        { label: "Descrição", sortKey: "description", strong: true, render: (r) => r.description },
        { label: "Serviço para", render: (r) => (r.modality === 2 ? "Contratos" : "Ordens de Serviço") },
        { label: "Preço", sortKey: "price", className: "md:text-right", render: (r) => money(r.price) },
        { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
      ]}
    />
  );
}
