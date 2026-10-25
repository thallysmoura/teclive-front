"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { getAiSummary, type AiSummary } from "@/lib/dashboard";

const PRIORITY: Record<string, { label: string; cls: string }> = {
  alta: { label: "Alta", cls: "bg-[#FDE6E4] text-[#B42318]" },
  media: { label: "Média", cls: "bg-[#FFF3D6] text-[#9A6200]" },
  baixa: { label: "Baixa", cls: "bg-[#E1EEFF] text-[#0B57B8]" },
};

/** Ícone de inteligência artificial (estrelas de brilho). */
export function AiIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9.5 3.5 11 8l4.5 1.5L11 11l-1.5 4.5L8 11 3.5 9.5 8 8z" />
      <path d="M17.5 12.5 18.6 15.4 21.5 16.5 18.6 17.6 17.5 20.5 16.4 17.6 13.5 16.5 16.4 15.4z" />
      <path d="M17 2.5 17.6 4 19.1 4.6 17.6 5.2 17 6.7 16.4 5.2 14.9 4.6 16.4 4z" />
    </svg>
  );
}

function Section({ icon, title, tone, children }: { icon: string; title: string; tone: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ds-border-subtle bg-white p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2.5 text-sm font-extrabold text-ds-primary-deep"><span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: tone }}><Icon name={icon} className="text-[18px]" /></span>{title}</h3>
      {children}
    </section>
  );
}

/** Janela do resumo executivo com IA: como está a empresa, o que pede atenção, como agir com o time e estratégia. */
export function AiSummaryModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<AiSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const run = useCallback(() => {
    setLoading(true); setError("");
    getAiSummary().then(setData).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível gerar o resumo.")).finally(() => setLoading(false));
  }, []);
  useEffect(() => { run(); }, [run]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-stretch justify-center bg-[#10202e]/60 sm:items-center sm:p-4" data-no-capture>
      <div className="absolute inset-0" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Resumo executivo com IA" className="relative flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-ds-bg shadow-2xl sm:h-auto sm:max-h-[94vh] sm:rounded-3xl">
        <header className="flex items-center gap-3 border-b border-ds-border-subtle bg-white px-4 py-3 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A5AF8] to-[#008DFF] text-white"><AiIcon className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1"><h2 className="text-lg font-extrabold leading-tight text-ds-primary-deep">Resumo executivo com IA</h2><p className="truncate text-xs text-ds-text-secondary">{data ? `Gerado em ${new Date(data.generatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : "Análise dos números da empresa"}</p></div>
          <button type="button" onClick={run} disabled={loading} className="inline-flex h-9 items-center rounded-lg border border-ds-border px-3 text-xs font-semibold text-ds-text-muted hover:border-ds-primary disabled:opacity-50">Gerar novamente</button>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#E5322D] hover:bg-[#E5322D]/10"><Icon name="close" className="text-[20px]" /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {loading && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7A5AF8] to-[#008DFF] text-white"><AiIcon className="h-9 w-9 animate-pulse" /></span>
              <div><p className="text-base font-extrabold text-ds-primary-deep">Analisando os dados da empresa...</p><p className="mt-1 text-sm text-ds-text-secondary">Isso leva alguns segundos.</p></div>
            </div>
          )}
          {!loading && error && (
            <div className="rounded-2xl border border-ds-danger-border bg-ds-danger-bg p-5 text-center"><p className="text-sm font-semibold text-ds-danger-text">{error}</p><button type="button" onClick={run} className="mt-3 h-10 rounded-[10px] bg-ds-primary-deep px-5 text-sm font-bold text-white">Tentar novamente</button></div>
          )}
          {!loading && data && (
            <>
              <Section icon="monitoring" title="Como está a empresa" tone="#005CD2">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ds-text">{data.panorama}</p>
                {data.indicadores.length > 0 && (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {data.indicadores.map((i, k) => (
                      <li key={k} className="rounded-xl bg-ds-bg px-3 py-2.5"><p className="text-[11px] font-bold uppercase tracking-wide text-ds-text-secondary">{i.rotulo}</p><p className="text-lg font-extrabold text-ds-primary-deep">{i.valor}</p><p className="text-xs leading-snug text-ds-text-muted">{i.leitura}</p></li>
                    ))}
                  </ul>
                )}
              </Section>
              {data.atencao.length > 0 && (
                <Section icon="priority_high" title="O que precisa de atenção" tone="#E5322D">
                  <ul className="space-y-2">{data.atencao.map((a, k) => { const p = PRIORITY[a.prioridade] ?? PRIORITY.media; return (
                    <li key={k} className="rounded-xl border border-ds-border-subtle px-3 py-2.5"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-ds-primary-deep">{a.titulo}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${p.cls}`}>{p.label}</span></div><p className="mt-1 text-sm leading-snug text-ds-text-muted">{a.detalhe}</p></li>
                  ); })}</ul>
                </Section>
              )}
              {data.time.length > 0 && (
                <Section icon="groups" title="Como agir com o time" tone="#12A262">
                  <ul className="space-y-2">{data.time.map((t, k) => <li key={k} className="rounded-xl bg-ds-bg px-3 py-2.5"><p className="text-sm font-bold text-ds-primary-deep">{t.titulo}</p><p className="mt-0.5 text-sm leading-snug text-ds-text-muted">{t.detalhe}</p></li>)}</ul>
                </Section>
              )}
              {data.estrategia.length > 0 && (
                <Section icon="flag" title="Estratégia para resolver as dores" tone="#F7941D">
                  <ul className="space-y-3">{data.estrategia.map((e, k) => (
                    <li key={k} className="rounded-xl border border-ds-border-subtle px-3 py-3"><p className="text-sm font-extrabold text-ds-primary-deep">{k + 1}. {e.titulo}</p>
                      <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm leading-snug text-ds-text-muted">{(e.passos ?? []).map((p, j) => <li key={j}>{p}</li>)}</ol>
                      {e.impacto && <p className="mt-2 rounded-lg bg-[#DDF6EA] px-2.5 py-1.5 text-xs font-semibold text-[#0B7A4B]">Impacto esperado: {e.impacto}</p>}
                    </li>
                  ))}</ul>
                </Section>
              )}
              <p className="px-1 pb-2 text-center text-[11px] text-ds-text-secondary">Gerado por IA a partir dos números do painel. Revise antes de decidir.</p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
