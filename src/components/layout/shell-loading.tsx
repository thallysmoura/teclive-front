"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout, type Me } from "@/lib/api";
import { cachedMe, clearSessionCache } from "@/lib/session-cache";
import { Sidebar } from "@/components/layout/sidebar";
import { FullScreenSpinner } from "@/components/ui/spinner";
import { ContentSpinner } from "@/components/ui/spinner";

/**
 * Carregamento de página: o menu lateral continua na tela e só a área de conteúdo mostra o spinner.
 * Sem sessão em cache (primeiro acesso) usa a tela cheia.
 */
export function ShellLoading() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => { setUser(cachedMe()); setReady(true); }, []);

  if (!ready || !user) return <FullScreenSpinner />;
  return (
    <div className="flex min-h-screen bg-ds-bg">
      <Sidebar user={user} onLogout={async () => { await logout(); clearSessionCache(); router.replace("/login"); }} />
      <ContentSpinner />
    </div>
  );
}
