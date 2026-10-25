"use client";

import { useEffect } from "react";

export function PwaInstall() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      // Atualização sem cache: procura versão nova do app ao abrir e ao voltar para a aba; quando a nova assume, recarrega uma vez.
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !reloaded) { reloaded = true; window.location.reload(); } });
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((reg) => {
        const check = () => { if (document.visibilityState === "visible") void reg.update().catch(() => undefined); };
        document.addEventListener("visibilitychange", check);
        setInterval(check, 5 * 60_000);
      }).catch(() => {
        console.error("Não foi possível registrar o service worker do euGestor.");
      });
    }
    const keep = (event: Event) => { event.preventDefault(); window.__egInstall = event as never; };
    window.addEventListener("beforeinstallprompt", keep);
    return () => window.removeEventListener("beforeinstallprompt", keep);
  }, []);

  return null;
}
