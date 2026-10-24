"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

const NavigationContext = createContext<((href: string) => void) | null>(null);

/** O carregamento só aparece se a espera passar disso — navegações rápidas não piscam. */
const SHOW_AFTER_MS = 150;
const FADE_OUT_MS = 200;

export function NavigationTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const navigate = useCallback((href: string) => {
    if (href === window.location.pathname) return;
    window.clearTimeout(timer.current);
    setLeaving(false);
    setStartedAt(performance.now());
    startTransition(() => router.push(href));
  }, [router]);

  useEffect(() => {
    if (startedAt === null || pending) return;
    const elapsed = performance.now() - startedAt;
    if (elapsed < SHOW_AFTER_MS) { setStartedAt(null); return; }
    // Já estava visível: sai com fade suave em vez de sumir de uma vez.
    setLeaving(true);
    timer.current = window.setTimeout(() => { setStartedAt(null); setLeaving(false); }, FADE_OUT_MS);
    return () => window.clearTimeout(timer.current);
  }, [startedAt, pending]);

  return (
    <NavigationContext.Provider value={navigate}>
      {children}
      {startedAt !== null && (
        <div
          role="status" aria-live="polite" aria-label="Carregando página"
          className={`pointer-events-none fixed inset-y-0 left-0 right-0 z-[40] flex items-center justify-center bg-ds-bg/75 backdrop-blur-[2px] md:left-64 ${leaving ? "motion-safe:animate-[overlay-out_200ms_ease-in_both]" : "motion-safe:animate-[overlay-in_220ms_ease-out_150ms_both]"}`}
        >
          <div className="flex flex-col items-center gap-3"><Spinner className="h-8 w-8 motion-reduce:animate-none" /><span className="text-sm text-ds-text-secondary">Carregando...</span></div>
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
