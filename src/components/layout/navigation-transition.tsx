"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

const NavigationContext = createContext<((href: string) => void) | null>(null);

export function NavigationTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const navigate = useCallback((href: string) => {
    if (href === window.location.pathname) return;
    setStartedAt(performance.now());
    startTransition(() => router.push(href));
  }, [router]);

  useEffect(() => {
    if (startedAt === null || pending) return;
    // Keep the animation visible briefly even when the destination is cached.
    const timer = window.setTimeout(() => setStartedAt(null), Math.max(0, 350 - (performance.now() - startedAt)));
    return () => window.clearTimeout(timer);
  }, [startedAt, pending]);

  return (
    <NavigationContext.Provider value={navigate}>
      {children}
      {startedAt !== null && (
        <div role="status" aria-live="polite" aria-label="Carregando página" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-ds-bg motion-safe:animate-[navigation-enter_160ms_ease-out]">
          <Spinner className="h-8 w-8 motion-reduce:animate-none" />
          <span className="text-sm text-ds-text-secondary">Carregando...</span>
        </div>
      )}
    </NavigationContext.Provider>
  );
}

export function useNavigationTransition() {
  const navigate = useContext(NavigationContext);
  if (!navigate) throw new Error("NavigationTransition provider is required.");
  return navigate;
}
