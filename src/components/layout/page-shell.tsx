"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, logout, type Me } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { AwaitingPermission } from "@/components/layout/awaiting-permission";
import { FullScreenSpinner } from "@/components/ui/spinner";

/** Casca padrão das telas autenticadas: sessão, sidebar e checagem de permissão do item de menu. */
export function PageShell({ permissionKey, children }: { permissionKey: string; children: (user: Me) => ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);

  useEffect(() => {
    getMe().then((me) => (me ? setUser(me) : router.replace("/login")));
  }, [router]);

  if (!user) return <FullScreenSpinner />;
  const hasAccess = user.role === "ADMIN" || user.permissions.includes(permissionKey);

  return (
    <div className="flex min-h-screen bg-ds-bg">
      <Sidebar user={user} onLogout={async () => { await logout(); router.replace("/login"); }} />
      {hasAccess ? <main className="min-w-0 flex-1 px-4 pb-10 pt-20 md:px-8 md:pt-10">{children(user)}</main> : <AwaitingPermission user={user} />}
    </div>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Navegação" className="mb-3 text-xs text-ds-text-secondary">
      {items.map((item, i) => (
        <span key={item.label}>
          {i > 0 && <span className="mx-1.5">/</span>}
          {item.href ? <a href={item.href} className="hover:text-ds-primary">{item.label}</a> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}
