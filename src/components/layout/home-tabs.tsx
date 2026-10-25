import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Me } from "@/lib/api";

export const OBRAS_PERMISSION = "item_9afd38a1-893b-4107-a3ba-62012a229679";
export type HomeTab = "geral" | "obras";

export const canSeeObras = (user: Me) => user.role === "ADMIN" || user.permissions.includes(OBRAS_PERMISSION);

/** Abas da Visão Geral Diretoria: o painel geral e a Gestão de Obras no mesmo lugar (a aba fica na URL: ?tab=obras). */
export function HomeTabs({ tab, user }: { tab: HomeTab; user: Me }) {
  if (!canSeeObras(user)) return null;
  const item = (id: HomeTab, label: string, icon: string, href: string) => (
    <Link key={id} href={href} scroll={false} role="tab" aria-selected={tab === id} className={`-mb-px inline-flex h-11 items-center gap-2 border-b-[3px] px-4 text-sm font-bold transition-colors ${tab === id ? "border-ds-primary text-ds-primary-deep" : "border-transparent text-ds-text-secondary hover:text-ds-primary"}`}>
      <Icon name={icon} className="text-[20px]" />{label}
    </Link>
  );
  return (
    <div role="tablist" aria-label="Seções da Visão Geral" className="mb-5 flex gap-1 overflow-x-auto border-b border-ds-border-subtle">
      {item("geral", "Visão Geral", "space_dashboard", "/home")}
      {item("obras", "Gestão de Obras", "engineering", "/home?tab=obras")}
    </div>
  );
}
