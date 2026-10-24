"use client";

import { formatDocument } from "@/lib/cadastros";
import { COMERCIAL_KEYS, leadsClient } from "@/lib/comercial";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { LeadForm, type LeadFormValue } from "@/components/comercial/lead-form";
import { LeadInsights } from "@/components/comercial/insights";
import type { Person } from "@/lib/cadastros";

const toInput = (v: LeadFormValue) => ({
  type: v.type, name: v.name, nickname: v.nickname, document: v.document, rg: "", identifier: "", isClient: false, isSupplier: false, isEmployee: false, isTechnician: false, isCarrier: false, isSeller: false,
  taxpayerType: null, isFinalConsumer: false, municipalRegistration: "", stateRegistration: "", email: v.email, phone: v.phone, sellerName: v.sellerName,
});

export default function ProspectsPage() {
  return (
    <CrudList<Person>
      permissionKey={COMERCIAL_KEYS.prospects} title="Leads" breadcrumb="Prospects" basePath="/comercial/prospects" newLabel="Novo Lead"
      searchPlaceholder="Pesquisar..." entityLabel="O lead" defaultSort="recent" api={leadsClient} rowName={(r) => r.name}
      header={<LeadInsights />}
      filterPanel={{
        inactiveLabel: "Exibir leads inativos",
        render: (draft, set) => (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ds-text-secondary">Tipo de Lead</span>
            <div className="inline-flex self-start overflow-hidden rounded-lg border border-ds-primary-deep">
              {([["", "Todos"], ["F", "Física"], ["J", "Jurídica"]] as const).map(([value, label]) => (
                <button key={label} type="button" onClick={() => set({ type: value })} className={`px-3 py-1.5 text-sm font-semibold ${draft.type === value ? "bg-ds-primary-deep text-white" : "bg-white text-ds-primary-deep"}`}>{label}</button>
              ))}
            </div>
          </div>
        ),
      }}
      creator={{ title: "Novo Lead", wide: true, render: ({ onSaved, onCancel }) => (
        <LeadForm submitLabel="Cadastrar Lead" onCancel={onCancel} onSubmit={async (v) => { await leadsClient.create(toInput(v)); onSaved(); }} />
      ) }}
      editor={{ title: "Editando Lead", wide: true, render: ({ item, onSaved, onCancel }) => (
        <LeadForm initial={item} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (v) => { await leadsClient.update(item.id, toInput(v)); onSaved(); }} />
      ) }}
      extraMenu={[{
        label: "Converter em cliente", icon: "how_to_reg", show: (row) => !row.becameClientAt,
        onClick: async (row, reload) => { if (window.confirm(`Converter "${row.name}" em cliente?`)) { await leadsClient.convert(row.id); await reload(); } },
      }]}
      columns={[
        { label: "Lead", sortKey: "name", strong: true, render: (r) => (
          <>
            {r.name}
            {r.becameClientAt && <span className="ml-2 rounded-full border border-ds-primary-deep px-2 py-0.5 text-[10px] font-bold text-ds-primary-deep">Cliente</span>}
            <span className="block text-xs font-normal text-ds-text-secondary">Vendedor: {r.sellerName || "Não informado"}</span>
          </>
        ) },
        { label: "CPF / CNPJ", render: (r) => formatDocument(r.document) },
        { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
      ]}
    />
  );
}
