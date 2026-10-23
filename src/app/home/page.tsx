"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, logout, type Me } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { AwaitingPermission } from "@/components/layout/awaiting-permission";
import { FullScreenSpinner } from "@/components/ui/spinner";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then((me) => {
      if (!me) {
        router.replace("/login");
        return;
      }
      setUser(me);
      setLoading(false);
    });
  }, [router]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (loading || !user) {
    return <FullScreenSpinner />;
  }

  const hasAccess = user.role === "ADMIN" || user.permissions.includes("inicio");

  return (
    <div className="flex min-h-screen bg-ds-bg">
      <Sidebar user={user} onLogout={handleLogout} />

      {hasAccess ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-4 pt-16 md:pt-0">
          <h1 className="text-2xl font-bold text-ds-primary-deep">Olá, {user.name}</h1>
          <p className="text-ds-text-secondary">
            Home / Indicadores — placeholder da Fase 1. Conteúdo real nas próximas fases.
          </p>
        </main>
      ) : (
        <AwaitingPermission user={user} />
      )}
    </div>
  );
}
