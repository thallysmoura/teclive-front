"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { HomeBanner } from "@/components/layout/home-banner";
import { listNavigation, type Me, type NavigationItem } from "@/lib/api";
import { RecentVisits } from "@/components/layout/recent-visits";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const LONG_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const GROUP_ICON: Record<string, string> = { Administrativo: "apartment", Comercial: "work", Operacional: "build", Estoque: "inventory_2" };

/** Visão Geral para quem não é administrador: abertura com o histórico de telas recentes e atalhos para tudo que a pessoa pode acessar. */
export function MemberHome({ user }: { user: Me }) {
  const [items, setItems] = useState<NavigationItem[] | null>(null);
  const now = new Date();
  const first = user.name.trim().split(/\s+/)[0];

  useEffect(() => { listNavigation().then(setItems).catch(() => setItems([])); }, [user.id]);

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
      <HomeBanner user={user} subtitle="Bem-vindo(a)! Continue de onde parou ou abra uma das suas áreas." />

      <RecentVisits userId={user.id} />

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
