"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { SECTIONS, SETTINGS_GROUPS, type Section } from "@/lib/settings-schema";

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hrefOf = (s: Section) => s.href ?? `/configuracoes/${s.slug}`;

/** Moldura das Configurações: menu em grupos à esquerda (vira lista recolhível no celular) e o conteúdo à direita. */
export function SettingsShell({ active, admin, children }: { active: string; admin: boolean; children: React.ReactNode }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const visible = useMemo(() => SECTIONS.filter((s) => (admin || s.slug === "meus-dados") && (!q || norm(`${s.title} ${s.group}`).includes(norm(q)))), [admin, q]);
  const current = SECTIONS.find((s) => s.slug === active);

  const nav = (
    <nav aria-label="Configurações" className="flex flex-col gap-4">
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" />
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar configuração..." aria-label="Buscar configuração" className="h-10 pl-10" />
      </div>
      {SETTINGS_GROUPS.map((group) => {
        const items = visible.filter((s) => s.group === group);
        if (!items.length) return null;
        return (
          <div key={group}>
            <h2 className="mb-1 px-2 text-xs font-bold uppercase tracking-wider text-ds-text-secondary">{group}</h2>
            <ul className="space-y-0.5">
              {items.map((s) => (
                <li key={s.slug}>
                  <Link href={hrefOf(s)} onClick={() => setOpen(false)} aria-current={s.slug === active ? "page" : undefined} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${s.slug === active ? "bg-ds-primary-deep text-white" : "text-ds-text-muted hover:bg-ds-bg hover:text-ds-primary-deep"}`}>
                    <Icon name={s.icon} className="text-[19px]" /><span className="min-w-0 flex-1 truncate">{s.title}</span>{s.href && s.slug !== active && <Icon name="open_in_new" className="text-[14px] opacity-50" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {visible.length === 0 && <p className="px-2 text-sm text-ds-text-secondary">Nenhuma configuração encontrada.</p>}
    </nav>
  );

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 lg:flex-row lg:gap-6">
      <aside className="lg:sticky lg:top-6 lg:w-72 lg:shrink-0 lg:self-start">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-xl border border-ds-border-subtle bg-white px-4 py-3 text-left lg:hidden">
          <Icon name="settings" className="text-[20px] text-ds-primary" /><span className="min-w-0 flex-1"><span className="block text-[11px] font-bold uppercase tracking-wider text-ds-text-secondary">Configurações</span><span className="block truncate text-sm font-semibold text-ds-primary-deep">{current?.title ?? "Escolher seção"}</span></span><Icon name={open ? "expand_less" : "expand_more"} className="text-ds-text-secondary" />
        </button>
        <div className={`${open ? "mt-2 block" : "hidden"} rounded-xl border border-ds-border-subtle bg-white p-3 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto`}>{nav}</div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
