"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Me } from "@/lib/api";
import { getAiSummary, type AiSummary } from "@/lib/dashboard";

const PRIORITY: Record<string, { label: string; icon: string; chip: string; bar: string }> = {
  alta: { label: "Prioridade alta", icon: "error", chip: "bg-[#FDE6E4] text-[#B42318]", bar: "bg-[#E5322D]" },
  media: { label: "Prioridade média", icon: "warning", chip: "bg-[#FFF3D6] text-[#9A6200]", bar: "bg-[#F7941D]" },
  baixa: { label: "Prioridade baixa", icon: "info", chip: "bg-[#E1EEFF] text-[#0B57B8]", bar: "bg-[#008DFF]" },
};
const KPI_ICONS = ["payments", "build", "alarm", "request_quote", "inventory_2"];

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

function Section({ icon, title, hint, tone, children }: { icon: string; title: string; hint?: string; tone: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-ds-border-subtle bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-ds-border-subtle px-4 py-3 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: tone }}><Icon name={icon} className="text-[20px]" /></span>
        <div className="min-w-0"><h3 className="text-[15px] font-extrabold leading-tight text-ds-primary-deep">{title}</h3>{hint && <p className="text-xs text-ds-text-secondary">{hint}</p>}</div>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

/** Janela do resumo executivo com IA: como está a empresa, o que pede atenção, como agir com o time e estratégia. */
function summaryText(d: AiSummary) {
  const lines = ["*Como estamos? — Teclive*", `_Resumo com IA em ${new Date(d.generatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}_`, "", "*Como está a empresa*", d.panorama];
  for (const i of d.indicadores) lines.push(`• ${i.rotulo}: ${i.valor} — ${i.leitura}`);
  if (d.atencao.length) { lines.push("", "*O que precisa de atenção*"); for (const a of d.atencao) lines.push(`• [${a.prioridade}] ${a.titulo}: ${a.detalhe}`); }
  if (d.time.length) { lines.push("", "*Como agir com o time*"); for (const t of d.time) lines.push(`• ${t.titulo}: ${t.detalhe}`); }
  if (d.estrategia.length) { lines.push("", "*Estratégia*"); d.estrategia.forEach((e, k) => { lines.push(`${k + 1}. ${e.titulo}`); for (const p of e.passos ?? []) lines.push(`   - ${p}`); if (e.impacto) lines.push(`   Impacto: ${e.impacto}`); }); }
  return lines.join("\n");
}

export function AiSummaryModal({ user, onClose }: { user: Me; onClose: () => void }) {
  const [shareMenu, setShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<AiSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const run = useCallback(() => {
    setLoading(true); setError(""); setData(null);
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

  async function share() {
    if (!data) return;
    const text = summaryText(data);
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: "Como estamos? — Teclive", text }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    setShareMenu((v) => !v); // sem compartilhamento nativo (alguns navegadores de computador): oferece WhatsApp, e-mail e copiar
  }
  const shareText = data ? summaryText(data) : "";

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-stretch justify-center bg-[#10202e]/60 sm:items-center sm:p-4" data-no-capture>
      <div className="absolute inset-0" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Resumo executivo com IA" className="relative flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-ds-bg shadow-2xl sm:h-auto sm:max-h-[94vh] sm:rounded-3xl">
        <header className="relative flex shrink-0 items-start gap-3 overflow-hidden bg-gradient-to-r from-ds-primary-deep to-ds-primary px-4 py-4 text-white sm:items-center sm:gap-4 sm:px-6 sm:py-5">
          <span className="shrink-0 rounded-full ring-2 ring-white/40"><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={52} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-4xl">Como estamos?</h2>
            <p className="mt-1.5 text-[13px] font-medium leading-snug text-white/85 sm:text-base">Inteligência artificial analisando os números da empresa para uma leitura precisa e objetiva.</p>
            {data && <p className="mt-1 text-[11px] text-white/60 sm:text-xs">Gerado em {new Date(data.generatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>}
          </div>
          <button type="button" onClick={run} disabled={loading} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-bold text-white ring-1 ring-white/20 transition-colors hover:bg-white/25 disabled:opacity-50"><Icon name="refresh" className={`text-[17px] ${loading ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Gerar novamente</span></button>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20 transition-colors hover:bg-[#E5322D]"><Icon name="close" className="text-[20px]" /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {loading && (
            <div className="flex flex-col items-center gap-5 py-16 text-center">
              <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-ds-primary-deep to-ds-primary text-white shadow-lg"><span className="absolute inset-0 animate-ping rounded-3xl bg-ds-primary/25" /><AiIcon className="relative h-10 w-10 animate-pulse" /></span>
              <div><p className="text-base font-extrabold text-ds-primary-deep">Analisando os dados da empresa...</p><p className="mt-1 text-sm text-ds-text-secondary">Isso leva alguns segundos.</p></div>
            </div>
          )}
          {!loading && error && (
            <div className="rounded-2xl border border-ds-danger-border bg-ds-danger-bg p-6 text-center"><Icon name="error" className="text-[32px] text-ds-danger-text" /><p className="mt-1 text-sm font-semibold text-ds-danger-text">{error}</p><button type="button" onClick={run} className="mt-4 h-10 rounded-[10px] bg-ds-primary-deep px-6 text-sm font-bold text-white">Tentar novamente</button></div>
          )}
          {!loading && data && (
            <>
              <Section icon="monitoring" title="Como está a empresa" hint="Panorama geral e números que mais importam" tone="#005CD2">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ds-text">{data.panorama}</p>
                {data.indicadores.length > 0 && (
                  <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {data.indicadores.map((i, k) => (
                      <li key={k} className="flex gap-3 rounded-xl border border-ds-border-subtle bg-ds-bg/60 p-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ds-primary/10 text-ds-primary"><Icon name={KPI_ICONS[k % KPI_ICONS.length]} className="text-[19px]" /></span>
                        <span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-wide text-ds-text-secondary">{i.rotulo}</span><span className="block text-lg font-extrabold leading-tight text-ds-primary-deep">{i.valor}</span><span className="block text-xs leading-snug text-ds-text-muted">{i.leitura}</span></span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {data.atencao.length > 0 && (
                <Section icon="notification_important" title="O que precisa de atenção" hint="Do mais crítico ao menos crítico" tone="#E5322D">
                  <ul className="space-y-2.5">{data.atencao.map((a, k) => { const p = PRIORITY[a.prioridade] ?? PRIORITY.media; return (
                    <li key={k} className="relative overflow-hidden rounded-xl border border-ds-border-subtle bg-white py-3 pl-5 pr-3">
                      <span className={`absolute inset-y-0 left-0 w-1.5 ${p.bar}`} />
                      <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-ds-primary-deep">{a.titulo}</span><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${p.chip}`}><Icon name={p.icon} className="text-[13px]" />{p.label}</span></div>
                      <p className="mt-1 text-sm leading-snug text-ds-text-muted">{a.detalhe}</p>
                    </li>
                  ); })}</ul>
                </Section>
              )}

              {data.time.length > 0 && (
                <Section icon="groups" title="Como agir com o time" hint="Cobranças, reconhecimentos e alinhamentos" tone="#12A262">
                  <ul className="grid gap-2.5 sm:grid-cols-2">{data.time.map((t, k) => (
                    <li key={k} className="rounded-xl border border-[#12A262]/20 bg-[#12A262]/5 p-3"><p className="flex items-start gap-2 text-sm font-bold text-ds-primary-deep"><Icon name="check_circle" className="mt-px shrink-0 text-[18px] text-[#12A262]" />{t.titulo}</p><p className="mt-1 pl-[26px] text-sm leading-snug text-ds-text-muted">{t.detalhe}</p></li>
                  ))}</ul>
                </Section>
              )}

              {data.estrategia.length > 0 && (
                <Section icon="flag" title="Estratégia para resolver as dores" hint="Ações priorizadas e o impacto esperado" tone="#F7941D">
                  <ul className="space-y-3">{data.estrategia.map((e, k) => (
                    <li key={k} className="rounded-xl border border-ds-border-subtle bg-white p-3.5">
                      <p className="flex items-center gap-2.5 text-sm font-extrabold text-ds-primary-deep"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F7941D] text-xs font-extrabold text-white">{k + 1}</span>{e.titulo}</p>
                      <ol className="mt-2.5 space-y-1.5 pl-1">{(e.passos ?? []).map((p, j) => <li key={j} className="flex items-start gap-2 text-sm leading-snug text-ds-text-muted"><Icon name="arrow_right_alt" className="mt-px shrink-0 text-[18px] text-ds-primary" />{p}</li>)}</ol>
                      {e.impacto && <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#DDF6EA] px-3 py-2 text-xs font-semibold text-[#0B7A4B]"><Icon name="trending_up" className="shrink-0 text-[16px]" />Impacto esperado: {e.impacto}</p>}
                    </li>
                  ))}</ul>
                </Section>
              )}
              <p className="flex items-center justify-center gap-1.5 px-1 pb-1 text-center text-[11px] text-ds-text-secondary"><AiIcon className="h-3.5 w-3.5 text-ds-primary" />Gerado por IA a partir dos números do painel. Revise antes de decidir.</p>
            </>
          )}
        </div>
        {!loading && data && (
          <footer className="shrink-0 border-t border-ds-border-subtle bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            {shareMenu && (
              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#12A262] text-sm font-bold text-white"><Icon name="chat" className="text-[20px]" />WhatsApp</a>
                <a href={`mailto:?subject=${encodeURIComponent("Como estamos? — Teclive")}&body=${encodeURIComponent(shareText)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ds-primary text-sm font-bold text-white"><Icon name="mail" className="text-[20px]" />E-mail</a>
                <button type="button" onClick={() => { void navigator.clipboard?.writeText(shareText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ds-border text-sm font-bold text-ds-primary-deep"><Icon name={copied ? "check" : "content_copy"} className="text-[20px]" />{copied ? "Copiado!" : "Copiar texto"}</button>
              </div>
            )}
            <button type="button" onClick={() => void share()} className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-ds-primary-deep text-[15px] font-bold text-white transition-colors hover:bg-ds-primary sm:text-base"><Icon name="share" className="text-[22px]" />Compartilhar resumo</button>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
