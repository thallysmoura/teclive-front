"use client";

import { CADASTROS_KEYS, PERSON_ROLES, formatDocument, peopleClient, roleLabels, type Person } from "@/lib/cadastros";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { PeopleInsights, PersonSummary } from "@/components/cadastros/insights";
import { PersonForm } from "@/components/cadastros/person-form";

export default function PeoplePage() {
  return (
    <CrudList<Person>
      permissionKey={CADASTROS_KEYS.pessoas} title="Pessoas" breadcrumb="Pessoas" basePath="/cadastros/pessoas" newLabel="Nova Pessoa"
      searchPlaceholder="Pesquisar..." entityLabel="A pessoa" defaultSort="recent" api={peopleClient} rowName={(r) => r.name}
      header={<PeopleInsights />}
      editor={{ title: "Editando Pessoa", wide: true, render: ({ item, onSaved, onCancel }) => (
        <>
          <PersonSummary person={item} />
          <PersonForm embedded initial={item} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (input) => { await peopleClient.update(item.id, input); onSaved(); }} />
        </>
      ) }}
      filterPanel={{
        inactiveLabel: "Exibir pessoas inativas", contractToggle: true,
        render: (draft, set) => (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ds-text-secondary">Tipo de Pessoa</span>
              <div className="inline-flex self-start overflow-hidden rounded-lg border border-ds-primary-deep">
                {([["", "Todos"], ["F", "Física"], ["J", "Jurídica"]] as const).map(([value, label]) => (
                  <button key={label} type="button" onClick={() => set({ type: value })} className={`px-3 py-1.5 text-sm font-semibold ${draft.type === value ? "bg-ds-primary-deep text-white" : "bg-white text-ds-primary-deep"}`}>{label}</button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ds-text-secondary">Tipo de Cadastro</span>
              <select value={draft.role} onChange={(e) => set({ role: e.target.value })} className="h-11 rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary">
                <option value="">Todos</option>{PERSON_ROLES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
          </div>
        ),
      }}
      columns={[
        { label: "Nome", sortKey: "name", strong: true, render: (r) => (<>{r.name}{r.nickname && <span className="ml-1 text-xs font-normal text-ds-text-secondary">({r.nickname})</span>}</>) },
        { label: "CPF / CNPJ", render: (r) => formatDocument(r.document) },
        { label: "Tipo", render: (r) => roleLabels(r) },
        { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
      ]}
    />
  );
}
