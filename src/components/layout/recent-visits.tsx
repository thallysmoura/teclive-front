"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { getRecent, type RecentVisit } from "@/lib/recent";

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

/** Histórico de acesso: as últimas telas do menu que a pessoa abriu (guardadas por usuário neste navegador). */
export function RecentVisits({ userId, limit = 5, className = "mb-8" }: { userId: string; limit?: number; className?: string }) {
  const [recent, setRecent] = useState<RecentVisit[]>([]);
  useEffect(() => { setRecent(getRecent(userId)); }, [userId]);
  return (
    <section aria-label="Acessados recentemente" className={className}>
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ds-text-secondary"><Icon name="history" className="text-[18px]" />Histórico de acesso</h2>
      {recent.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ds-border bg-white px-5 py-6 text-center text-sm text-ds-text-secondary">Você ainda não abriu nenhuma tela por aqui. Escolha uma área no menu para começar.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recent.slice(0, limit).map((r) => (
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
  );
}
