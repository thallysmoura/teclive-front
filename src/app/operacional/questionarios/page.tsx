"use client";

import { OPERACIONAL_KEYS, questionnaireClient, type OpQuestionnaire } from "@/lib/operacional";
import { CrudList, activeBadge } from "@/components/cadastros/crud-list";
import { QuestionnaireForm } from "@/components/operacional/lookup-forms";

export default function QuestionnairesPage() {
  return (
    <CrudList<OpQuestionnaire>
      permissionKey={OPERACIONAL_KEYS.questionarios} title="Questionários" group="Operacional" breadcrumb="Questionários" basePath="/operacional/questionarios" newLabel="Novo Questionário"
      searchPlaceholder="Pesquise pelo título do questionário..." entityLabel="O questionário" defaultSort="title" api={questionnaireClient} rowName={(r) => r.title}
      creator={{ title: "Adicionando Questionário", render: ({ onSaved, onCancel }) => (
        <QuestionnaireForm submitLabel="Criar questionário" onCancel={onCancel} onSubmit={async (v) => { await questionnaireClient.create(v); onSaved(); }} />
      ) }}
      editor={{ title: "Editando Questionário", render: ({ item, onSaved, onCancel }) => (
        <QuestionnaireForm initial={item} submitLabel="Salvar Alteração" onCancel={onCancel} onSubmit={async (v) => { await questionnaireClient.update(item.id, v); onSaved(); }} />
      ) }}
      columns={[
        { label: "Título", sortKey: "title", strong: true, render: (r) => r.title },
        { label: "Descrição", render: (r) => r.description ?? "—" },
        { label: "Perguntas", sortKey: "questionCount", render: (r) => r.questionCount },
        { label: "Status", sortKey: "isActive", render: (r) => activeBadge(r.isActive) },
      ]}
    />
  );
}
