"use client";

import { useSyncExternalStore } from "react";

const BUILD_YEAR = new Date().getFullYear();
const subscribe = () => () => {};
const currentYear = () => new Date().getFullYear();
const serverYear = () => BUILD_YEAR;

export function CopyrightFooter() {
  const year = useSyncExternalStore(subscribe, currentYear, serverYear);

  return (
    <footer className="relative z-10 pb-6 text-center text-xs text-white/70">
      © {year} TecLive Serviços em Tecnologia. Todos os direitos reservados.
    </footer>
  );
}
