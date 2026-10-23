"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, logout } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Me = { id: string; email: string; name: string };

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ds-bg text-ds-text-secondary">
        Carregando...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ds-bg">
      <h1 className="text-2xl font-bold text-ds-primary-deep">
        Olá, {user?.name ?? user?.email}
      </h1>
      <p className="text-ds-text-secondary">
        Home / Indicadores — placeholder da Fase 1. Conteúdo real nas próximas fases.
      </p>
      <Button
        variant="secondary"
        onClick={async () => {
          await logout();
          router.replace("/login");
        }}
      >
        Sair
      </Button>
    </div>
  );
}
