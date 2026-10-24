"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HELP_SECTIONS, type HelpTopic } from "@/lib/help-content";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const matches = (topic: HelpTopic, q: string) => norm([topic.title, topic.path, topic.purpose, ...topic.steps, ...(topic.tips ?? [])].join(" ")).includes(q);

function Topic({ topic, open, onToggle }: { topic: HelpTopic; open: boolean; onToggle: () => void }) {
  return (
    <article id={topic.id} className="scroll-mt-24 overflow-hidden rounded-xl border border-ds-border-subtle bg-white">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${topic.id}-body`} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-ds-bg">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ds-primary/10 text-ds-primary"><Icon name={topic.icon} className="!text-[22px]" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ds-primary-deep">{topic.title}</span>
          <span className="block truncate text-xs text-ds-text-secondary">{topic.path}</span>
        </span>
        <Icon name={open ? "expand_less" : "expand_more"} className="text-ds-text-secondary" />
      </button>
      {open && (
        <div id={`${topic.id}-body`} className="space-y-4 border-t border-ds-border-subtle px-4 py-4 text-sm text-ds-text">
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-ds-text-secondary">Para que serve</h3>
            <p className="text-ds-text-muted">{topic.purpose}</p>
          </section>
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ds-text-secondary">Como usar</h3>
            <ol className="space-y-2">
              {topic.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ds-primary-deep text-xs font-bold text-white">{i + 1}</span>
                  <span className="pt-0.5 text-ds-text-muted">{step}</span>
                </li>
              ))}
            </ol>
          </section>
          {topic.tips && topic.tips.length > 0 && (
            <section className="rounded-lg border border-ds-primary/20 bg-ds-primary/5 p-3">
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ds-primary-deep"><Icon name="lightbulb" className="text-[16px]" />Dicas</h3>
              <ul className="list-disc space-y-1 pl-5 text-ds-text-muted">{topic.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
            </section>
          )}
          {topic.href && (
            <Link href={topic.href} className="inline-flex items-center gap-2 rounded-lg border border-ds-primary-deep px-3 py-1.5 text-sm font-semibold text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white">
              Abrir {topic.title}<Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

function Help() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const q = norm(query.trim());

  const sections = useMemo(
    () => HELP_SECTIONS.map((section) => ({ ...section, topics: q ? section.topics.filter((t) => matches(t, q)) : section.topics })).filter((section) => section.topics.length > 0),
    [q],
  );
  const total = sections.reduce((sum, s) => sum + s.topics.length, 0);

  // Abre sozinho o assunto indicado na URL (#orcamentos) para links diretos.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) { setOpen((o) => ({ ...o, [id]: true })); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 200); }
  }, []);

  const isOpen = (id: string) => (q ? open[id] !== false : !!open[id]);
  const allIds = HELP_SECTIONS.flatMap((s) => s.topics.map((t) => t.id));

  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Governança" }, { label: "Ajuda" }]} />
      <header className="mb-5">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-ds-primary-deep"><Icon name="help" className="!text-[32px]" />Central de Ajuda</h1>
        <p className="mt-1 max-w-3xl text-sm text-ds-text-secondary">Um guia passo a passo para cada item do menu: para que serve, como usar e boas práticas. Procure um assunto ou navegue pelo índice.</p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-ds-border-subtle bg-white p-4">
        <div className="relative min-w-[220px] max-w-xl flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="O que você quer fazer? Ex.: criar orçamento, exportar, permissões..." className="pl-10" aria-label="Buscar na ajuda" />
        </div>
        <div className="flex gap-2 text-sm">
          <button type="button" onClick={() => setOpen(Object.fromEntries(allIds.map((id) => [id, true])))} className="rounded-lg border border-ds-border px-3 py-2 font-semibold text-ds-text-muted hover:border-ds-primary hover:text-ds-primary">Expandir tudo</button>
          <button type="button" onClick={() => setOpen(q ? Object.fromEntries(allIds.map((id) => [id, false])) : {})} className="rounded-lg border border-ds-border px-3 py-2 font-semibold text-ds-text-muted hover:border-ds-primary hover:text-ds-primary">Recolher tudo</button>
        </div>
        {q && <p className="w-full text-xs text-ds-text-secondary">{total} {total === 1 ? "assunto encontrado" : "assuntos encontrados"}</p>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
        <nav aria-label="Índice da ajuda" className="hidden self-start rounded-xl border border-ds-border-subtle bg-white p-3 lg:sticky lg:top-6 lg:block">
          <ul className="space-y-3">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#sec-${section.id}`} className="flex items-center gap-2 text-sm font-semibold text-ds-primary-deep hover:text-ds-primary"><Icon name={section.icon} className="text-[18px]" />{section.title}</a>
                <ul className="mt-1 space-y-0.5 border-l border-ds-border-subtle pl-3">
                  {section.topics.map((t) => <li key={t.id}><a href={`#${t.id}`} onClick={() => setOpen((o) => ({ ...o, [t.id]: true }))} className="block py-0.5 text-xs text-ds-text-muted hover:text-ds-primary">{t.title}</a></li>)}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-8">
          {sections.map((section) => (
            <section key={section.id} id={`sec-${section.id}`} className="scroll-mt-24">
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ds-primary-deep text-white"><Icon name={section.icon} className="!text-[22px]" /></span>
                <div><h2 className="text-lg font-bold text-ds-primary-deep">{section.title}</h2><p className="text-sm text-ds-text-secondary">{section.intro}</p></div>
              </div>
              <div className="space-y-2">
                {section.topics.map((topic) => <Topic key={topic.id} topic={topic} open={isOpen(topic.id)} onToggle={() => setOpen((o) => ({ ...o, [topic.id]: !isOpen(topic.id) }))} />)}
              </div>
            </section>
          ))}
          {sections.length === 0 && (
            <div className="rounded-xl border border-ds-border-subtle bg-white py-14 text-center">
              <Icon name="search_off" className="!text-[48px] text-ds-border" />
              <p className="mt-2 text-sm text-ds-text-secondary">Nenhum assunto encontrado para &quot;{query}&quot;. Tente outra palavra, como &quot;orçamento&quot;, &quot;estoque&quot; ou &quot;usuário&quot;.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function HelpPage() {
  return <PageShell permissionKey={null}>{() => <Help />}</PageShell>;
}
