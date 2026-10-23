"use client";

import { useEffect } from "react";

export function PwaInstall() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        console.error("Não foi possível registrar o service worker do euGestor.");
      });
    }
  }, []);

  return null;
}
