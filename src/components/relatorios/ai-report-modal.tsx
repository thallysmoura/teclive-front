"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { AiIcon } from "@/components/layout/ai-summary-modal";
import { generateAiReport } from "@/lib/relatorios";

const EXAMPLES = [
  "Orçamentos por vendedor neste ano",
  "Ordens de serviço por defeito",
  "Clientes pessoa jurídica cadastrados neste mês",
  "Produtos por marca com preço de venda",
  "Estoque com saldo negativo por local",
];

export const AI_REPORT_KEY = "eg:ai-report";

/** Janela para pedir à IA um relatório personalizado com os dados do banco. */
export function AiReportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState("");
  const [error, setError] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    area.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose, loading]);

  async function submit() {
    if (loading) return;
    setError(""); setNotFound("");
    if (text.trim().length < 8) return setError("Descreva o relatório que você quer (uma frase já basta).");
    setLoading(true);
    try {
      const r = await generateAiReport(text);
      if (!r.found) { setNotFound(r.message); return; }
      try { sessionStorage.setItem(AI_REPORT_KEY, JSON.stringify(r.report)); } catch { /* sem armazenamento: a tela mostra o erro */ }
      router.push("/relatorios/ia");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível gerar o relatório."); }
    finally { setLoading(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-stretch justify-center bg-[#10202e]/60 sm:items-center sm:p-4" data-no-capture>
      <div className="absolute inset-0" onClick={() => !loading && onClose()} />
      <div role="dialog" aria-modal="true" aria-label="Relatório personalizado com IA" className="relative flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-3xl">
        <header className="flex shrink-0 items-center gap-3 bg-gradient-to-r from-ds-primary-deep to-ds-primary px-4 py-4 text-white sm:px-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><AiIcon className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1"><h2 className="text-lg font-extrabold leading-tight sm:text-xl">Relatório personalizado com IA</h2><p className="text-xs text-white/80 sm:text-sm">Peça em uma frase o que você quer ver nos dados do sistema.</p></div>
          <button type="button" onClick={onClose} disabled={loading} aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20 hover:bg-[#E5322D]"><Icon name="close" className="text-[20px]" /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <label className="block"><span className="mb-1 block text-xs font-bold text-ds-text-secondary">O que você quer no relatório?</span>
            <textarea ref={area} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={5} disabled={loading} placeholder="Ex.: ordens de serviço abertas neste mês, agrupadas por tipo" className="w-full resize-none rounded-[10px] border border-ds-border bg-white px-3 py-2.5 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" /></label>
          <div>
            <p className="mb-2 text-xs font-bold text-ds-text-secondary">Ideias</p>
            <div className="flex flex-wrap gap-2">{EXAMPLES.map((ex) => <button key={ex} type="button" disabled={loading} onClick={() => setText(ex)} className="rounded-full border border-ds-border bg-white px-3 py-1.5 text-xs font-semibold text-ds-text-muted hover:border-ds-primary hover:text-ds-primary">{ex}</button>)}</div>
          </div>
          <p className="rounded-xl bg-ds-bg px-3 py-2.5 text-xs leading-relaxed text-ds-text-muted">A IA usa os dados de <strong>pessoas, orçamentos, ordens de serviço, produtos e estoque</strong>. Se o que você pedir não existir nesses dados, ela avisa que não encontrou.</p>
          {notFound && <p role="status" className="flex items-start gap-2 rounded-xl border border-[#F7941D]/40 bg-[#FFF3D6] px-3 py-3 text-sm font-semibold text-[#8A5300]"><Icon name="search_off" className="mt-px shrink-0 text-[20px]" />{notFound}</p>}
          {error && <p role="alert" className="text-sm font-medium text-ds-danger-text">{error}</p>}
        </div>

        <footer className="flex shrink-0 gap-2 border-t border-ds-border-subtle px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3">
          <button type="button" onClick={onClose} disabled={loading} className="h-11 flex-1 rounded-[10px] border border-ds-border text-sm font-semibold text-ds-text-muted hover:border-ds-primary sm:flex-none sm:px-8">Cancelar</button>
          <button type="button" onClick={() => void submit()} disabled={loading} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-ds-primary-deep text-sm font-bold text-white hover:bg-ds-primary disabled:opacity-60 sm:ml-auto sm:flex-none sm:px-8">{loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Gerando...</> : "Gerar relatório"}</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
