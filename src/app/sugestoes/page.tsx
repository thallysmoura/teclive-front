"use client";

import { useEffect, useMemo, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import { listAllSuggestions, setSuggestionStatus, STATUS_INFO, type AdminSuggestion, type SuggestionStatus } from "@/lib/suggestions";

const ORDER: SuggestionStatus[] = ["NOVA", "EM_ANALISE", "PLANEJADA", "CONCLUIDA", "DESCARTADA"];
const fmt = (iso: string) => `${new Date(iso).toLocaleDateString("pt-BR")} às ${new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

function Suggestions() {
  const [items, setItems] = useState<AdminSuggestion[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<SuggestionStatus | "TODAS">("NOVA");
  const [zoom, setZoom] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { listAllSuggestions().then(setItems).catch((e) => { setError(e instanceof Error ? e.message : "Não foi possível carregar."); setItems([]); }); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { TODAS: items?.length ?? 0 };
    for (const s of items ?? []) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [items]);
  const shown = (items ?? []).filter((s) => filter === "TODAS" || s.status === filter);

  async function change(s: AdminSuggestion, status: SuggestionStatus) {
    if (status === s.status) return;
    setSaving(s.id); setError("");
    try {
      await setSuggestionStatus(s.id, status);
      setItems((all) => all?.map((x) => (x.id === s.id ? { ...x, status } : x)) ?? all);
      window.dispatchEvent(new Event("sidebar:updated"));
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível alterar."); }
    finally { setSaving(null); }
  }

  const chip = (id: SuggestionStatus | "TODAS", label: string) => (
    <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors ${filter === id ? "bg-ds-primary-deep text-white" : "border border-ds-border bg-white text-ds-text-muted hover:border-ds-primary"}`}>
      {label}<span className={`rounded-full px-1.5 text-xs ${filter === id ? "bg-white/20" : "bg-ds-bg"}`}>{counts[id] ?? 0}</span>
    </button>
  );

  return (
    <div className="mx-auto max-w-[1100px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Governança" }, { label: "Envios de melhorias" }]} />
      <header className="mb-5">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-ds-primary-deep"><Icon name="lightbulb" className="!text-[30px]" />Envios de melhorias</h1>
        <p className="mt-1 text-sm text-ds-text-secondary">Sugestões enviadas pelas pessoas direto das telas. Ao mudar a situação, todos os administradores são avisados.</p>
      </header>
      <div className="mb-4 flex flex-wrap gap-2">{chip("NOVA", "Pendentes")}{chip("EM_ANALISE", "Em análise")}{chip("PLANEJADA", "Planejadas")}{chip("CONCLUIDA", "Resolvidas")}{chip("DESCARTADA", "Descartadas")}{chip("TODAS", "Todas")}</div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      {!items ? <p className="py-16 text-center text-sm text-ds-text-secondary">Carregando...</p> : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ds-border bg-white px-5 py-10 text-center text-sm text-ds-text-secondary">Nenhuma sugestão nesta situação.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((s) => {
            const [text, notes] = s.description.split(/\n\nObservações nos pontos da imagem:\n/);
            return (
              <li key={s.id} className="grid gap-4 rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm sm:grid-cols-[220px_1fr]">
                {s.imageUrl ? (
                  <button type="button" onClick={() => setZoom(s.imageUrl)} aria-label="Ampliar imagem" className="cursor-zoom-in overflow-hidden rounded-xl border border-ds-border-subtle">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.imageUrl} alt="" className="h-36 w-full object-cover object-top sm:h-full sm:min-h-[130px]" />
                  </button>
                ) : <span className="flex min-h-[110px] items-center justify-center rounded-xl bg-ds-bg text-ds-text-secondary"><Icon name="image_not_supported" className="text-[28px]" /></span>}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="flex min-w-0 items-center gap-2"><UserAvatar name={s.author.name} avatarUrl={s.author.avatarUrl} size={28} /><span className="truncate text-sm font-bold text-ds-primary-deep">{s.author.name}</span></span>
                    <span className="text-xs text-ds-text-secondary">{fmt(s.createdAt)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_INFO[s.status].cls}`}>{STATUS_INFO[s.status].label}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-ds-text-secondary"><Icon name="web" className="mr-1 align-middle text-[14px]" />{s.screenTitle} <span className="opacity-70">({s.screenPath})</span></p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ds-text">{text}</p>
                  {notes && <ul className="mt-2 space-y-0.5 rounded-lg bg-ds-bg px-3 py-2 text-xs text-ds-text-muted">{notes.split("\n").map((n) => <li key={n}>{n}</li>)}</ul>}
                  <label className="mt-3 flex items-center gap-2 text-xs font-bold text-ds-text-secondary">Situação
                    <select value={s.status} disabled={saving === s.id} onChange={(e) => void change(s, e.target.value as SuggestionStatus)} className="h-9 rounded-lg border border-ds-border bg-white px-2.5 text-sm font-medium text-ds-text outline-none focus:border-ds-primary disabled:opacity-60">
                      {ORDER.map((st) => <option key={st} value={st}>{STATUS_INFO[st].label}</option>)}
                    </select>
                    {saving === s.id && <span className="h-4 w-4 animate-spin rounded-full border-2 border-ds-primary/30 border-t-ds-primary" />}
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {zoom && (
        <div role="dialog" aria-label="Imagem ampliada" onClick={() => setZoom(null)} className="fixed inset-0 z-[70] flex cursor-zoom-out items-center justify-center bg-black/80 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-[92vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}

export default function SuggestionsPage() {
  return <PageShell permissionKey="envios_melhorias">{() => <Suggestions />}</PageShell>;
}
