"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { FieldLabel, Input } from "@/components/ui/input";

export const TEMPLATE_VARIABLES: [string, string][] = [
  ["{{numero_orcamento}}", "Número do orçamento"], ["{{titulo}}", "Título do orçamento"], ["{{cliente_nome}}", "Nome ou razão social do cliente"], ["{{cliente_documento}}", "CPF ou CNPJ do cliente"],
  ["{{vendedor_nome}}", "Nome do vendedor"], ["{{data_abertura}}", "Data de abertura"], ["{{data_validade}}", "Data de validade"], ["{{valor_total}}", "Valor total líquido"],
  ["{{ficha_tecnica}}", "Ficha técnica"], ["{{itens_produtos}}", "Tabela de produtos"], ["{{itens_servicos}}", "Tabela de serviços"], ["{{condicao_pagamento}}", "Condição de pagamento escolhida"],
];

export function VariablesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState("");
  return (
    <Modal open={open} onClose={onClose} wide labelledBy="variables-title">
      <h2 id="variables-title" className="mb-1 text-lg font-bold text-ds-primary-deep">Variáveis disponíveis</h2>
      <p className="mb-4 text-sm text-ds-text-secondary">Copie uma variável e cole no seu documento .docx. Ela será substituída pelos dados do orçamento.</p>
      <ul className="grid gap-2 md:grid-cols-2">
        {TEMPLATE_VARIABLES.map(([name, hint]) => (
          <li key={name} className="flex items-center justify-between gap-3 rounded-lg border border-ds-border-subtle px-3 py-2">
            <span><code className="text-sm font-semibold text-ds-primary-deep">{name}</code><span className="block text-xs text-ds-text-secondary">{hint}</span></span>
            <button type="button" onClick={() => { void navigator.clipboard?.writeText(name); setCopied(name); setTimeout(() => setCopied(""), 1500); }} className="shrink-0 rounded-md border border-ds-primary-deep px-2 py-1 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white">{copied === name ? "Copiado" : "Copiar"}</button>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={onClose}>Fechar</Button></div>
    </Modal>
  );
}

const MAX_BYTES = 500 * 1024;

/** Novo template: passo a passo e envio do arquivo .docx. */
export function TemplateUploadForm({ onSubmit, onCancel }: { onSubmit: (description: string, file: File) => Promise<void>; onCancel: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [variables, setVariables] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function pick(f: File | undefined) {
    if (!f) return;
    if (!/\.docx$/i.test(f.name)) return setError("Selecione um arquivo no formato .docx.");
    if (f.size > MAX_BYTES) return setError("O arquivo deve ter no máximo 500 KB.");
    setError(""); setFile(f); setDescription((d) => d || f.name.replace(/\.docx$/i, ""));
  }

  async function submit() {
    if (!file) return setError("Selecione o arquivo do template.");
    if (!description.trim()) return setError("Informe a descrição do template.");
    setSaving(true); setError("");
    try { await onSubmit(description.trim(), file); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar o template."); setSaving(false); }
  }

  const step = (n: number, title: string, text: string, extra?: React.ReactNode) => (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ds-warning text-sm font-bold text-ds-warning-text">{n}</span>
      <div><p className="text-sm font-semibold text-ds-text">{title}</p><p className="text-xs text-ds-text-secondary">{text}</p>{extra}</div>
    </li>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ds-text-secondary">Siga os passos abaixo para cadastrar um novo template de orçamento.</p>
      <ol className="flex flex-col gap-4">
        {step(1, "Criar o arquivo do template", "Crie o template em um editor da sua preferência e salve o arquivo no formato .docx.")}
        {step(2, "Inserir variáveis no arquivo", "Abra o painel de variáveis e adicione os campos necessários no documento.",
          <button type="button" onClick={() => setVariables(true)} className="mt-1 rounded-md border border-ds-primary-deep px-2 py-1 text-xs font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white">Ver variáveis disponíveis</button>)}
        {step(3, "Enviar o template criado", "Selecione o arquivo .docx para cadastrar o novo template.")}
      </ol>
      <button type="button" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }} className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ds-border bg-ds-bg px-4 py-8 text-sm font-semibold text-ds-primary-deep hover:border-ds-primary">
        <Icon name="description" className="!text-[28px]" />{file ? `${file.name} (${Math.ceil(file.size / 1024)} KB)` : "Selecionar Arquivo"}
      </button>
      <input ref={input} type="file" accept=".docx" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {file && (
        <label className="flex flex-col gap-1.5"><FieldLabel>Descrição do template</FieldLabel><Input value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} /></label>
      )}
      {error && <p role="alert" className="text-sm text-ds-danger-text">{error}</p>}
      <div className="flex justify-center gap-3 border-t border-ds-border-subtle pt-4">
        <Button type="button" onClick={submit} disabled={saving || !file}>{saving ? "Salvando..." : "Salvar"}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
      <VariablesModal open={variables} onClose={() => setVariables(false)} />
    </div>
  );
}
