"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Abertura do app instalado (PWA), como um aplicativo nativo: fundo #00558C e a logo no centro ao abrir
 * e sempre que a pessoa volta para o app. Fora do app instalado a CSS esconde tudo (classe .app-splash).
 */
export function AppSplash() {
  const [visible, setVisible] = useState(true); // já vem no HTML do servidor: sem piscar de branco
  const [fade, setFade] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const hideAfter = useCallback((ms: number) => {
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setFade(true), ms),
      setTimeout(() => setVisible(false), ms + 350),
    ];
  }, []);

  useEffect(() => {
    // Abertura: espera a página carregar (mínimo de 0,9 s para a logo aparecer).
    const started = performance.now();
    const done = () => hideAfter(Math.max(0, 900 - (performance.now() - started)));
    if (document.readyState === "complete") done(); else window.addEventListener("load", done, { once: true });

    // Retorno ao app depois de ficar em segundo plano.
    let leftAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { leftAt = Date.now(); return; }
      if (leftAt && Date.now() - leftAt > 2000 && window.matchMedia("(display-mode: standalone)").matches) {
        setFade(false); setVisible(true); hideAfter(700);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("load", done); document.removeEventListener("visibilitychange", onVisibility); timers.current.forEach(clearTimeout); };
  }, [hideAfter]);

  if (!visible) return null;
  return (
    <div aria-hidden="true" data-no-capture className={`app-splash fixed inset-0 z-[100] flex-col items-center justify-center gap-5 bg-[#00558C] transition-opacity duration-300 ${fade ? "opacity-0" : "opacity-100"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png?v=3" alt="" width={132} height={132} className="h-[132px] w-[132px] animate-pulse select-none" draggable={false} />
      <span className="text-[15px] font-bold tracking-wide text-white/85">Teclive Tecnologia</span>
    </div>
  );
}
