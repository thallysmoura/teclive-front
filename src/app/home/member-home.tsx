"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import { listNavigation, type Me, type NavigationItem } from "@/lib/api";
import { getRecent, type RecentVisit } from "@/lib/recent";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const LONG_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const GROUP_ICON: Record<string, string> = { Administrativo: "apartment", Comercial: "work", Operacional: "build", Estoque: "inventory_2" };

function ago(iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "ontem" : `há ${days} dias`;
}

/** Visão Geral para quem não é administrador: abertura com o histórico de telas recentes e atalhos para tudo que a pessoa pode acessar. */
export function MemberHome({ user }: { user: Me }) {
  const [items, setItems] = useState<NavigationItem[] | null>(null);
  const [recent, setRecent] = useState<RecentVisit[]>([]);
  const now = new Date();
  const first = user.name.trim().split(/\s+/)[0];

  useEffect(() => { setRecent(getRecent(user.id)); listNavigation().then(setItems).catch(() => setItems([])); }, [user.id]);

  // Atalhos: somente telas reais (com endereço próprio) que a pessoa tem permissão de abrir, agrupadas pelo grupo do menu.
  const groups = useMemo(() => {
    if (!items) return [];
    const main = items.filter((i) => i.section === "main");
    const allowed = (i: NavigationItem) => !!i.href && !i.href.startsWith("/items/") && i.key !== "inicio" && user.permissions.includes(i.key);
    const groupOf = (i: NavigationItem) => main.find((p) => p.key === i.parentKey)?.label ?? "Geral";
    const map = new Map<string, NavigationItem[]>();
    for (const i of main.filter(allowed).sort((a, b) => a.sortOrder - b.sortOrder)) map.set(groupOf(i), [...(map.get(groupOf(i)) ?? []), i]);
    return [...map.entries()];
  }, [items, user.permissions]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-6 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-ds-primary-deep via-[#00558c] to-ds-primary p-4 text-white shadow-sm sm:gap-4 sm:p-6">
        <span className="shrink-0 rounded-full bg-white/15 p-1 sm:p-1.5"><span className="hidden sm:block"><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={72} presence="online" /></span><span className="sm:hidden"><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={52} presence="online" /></span></span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-3xl">Olá, {first}!</h1>
          <p className="mt-0.5 text-[13px] leading-snug text-white/85 first-letter:uppercase sm:mt-1 sm:text-sm">{WEEKDAYS[now.getDay()]}, {now.getDate()} de {LONG_MONTHS[now.getMonth()]}<span> de {now.getFullYear()}</span></p>
          <p className="mt-0.5 hidden text-xs text-white/70 sm:block">Bem-vindo(a)! Continue de onde parou ou abra uma das suas áreas.</p>
        </div>
      </header>

      <section aria-label="Acessados recentemente" className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ds-text-secondary"><Icon name="history" className="text-[18px]" />Acessados recentemente</h2>
        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ds-border bg-white px-5 py-6 text-center text-sm text-ds-text-secondary">Você ainda não abriu nenhuma tela por aqui. Escolha uma área abaixo para começar.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.slice(0, 6).map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="group flex items-center gap-3 rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-ds-primary hover:shadow-md">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ds-primary/10 text-ds-primary"><Icon name={GROUP_ICON[r.group ?? ""] ?? "article"} className="text-[22px]" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-ds-primary-deep">{r.label}</span><span className="block truncate text-xs text-ds-text-secondary">{r.group ? `${r.group} · ` : ""}{ago(r.at)}</span></span>
                  <Icon name="arrow_forward" className="text-[18px] text-ds-border transition-colors group-hover:text-ds-primary" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Suas áreas">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ds-text-secondary"><Icon name="apps" className="text-[18px]" />Suas áreas</h2>
        {!items ? <p className="py-6 text-center text-sm text-ds-text-secondary">Carregando...</p> : groups.length === 0 ? (
          <p className="rounded-2xl border border-ds-border-subtle bg-white px-5 py-6 text-center text-sm text-ds-text-secondary">Nenhuma área liberada para você ainda. Peça acesso a um administrador.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {groups.map(([group, list]) => (
              <div key={group} className="min-w-0 rounded-3xl border border-ds-border-subtle bg-white/70 p-4">
                <h3 className="mb-3 flex items-center gap-2.5 text-sm font-extrabold text-ds-primary-deep"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ds-primary-deep text-white"><Icon name={GROUP_ICON[group] ?? "folder"} className="text-[18px]" /></span>{group}<span className="ml-auto rounded-full bg-ds-bg px-2 py-0.5 text-xs font-semibold text-ds-text-muted">{list.length}</span></h3>
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {list.map((i) => <li key={i.key}><Link href={i.href!} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ds-text-muted transition-colors hover:bg-ds-bg hover:text-ds-primary-deep"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ds-primary" /><span className="min-w-0 flex-1 truncate">{i.label}</span><Icon name="arrow_forward" className="text-[16px] opacity-40" /></Link></li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
