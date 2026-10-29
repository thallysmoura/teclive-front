"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Prompt = Event & { prompt: () => Promise<void> };

export default function Instalar() {
  const [evt, setEvt] = useState<Prompt | null>(null);
  const [ios, setIos] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const on = (e: Event) => { e.preventDefault(); setEvt(e as Prompt); };
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", () => setDone(true));
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-[#4B66A8] to-[#2D4278] px-6 text-center text-white">
      <img src="/pwa/icon-192.png" alt="" width={96} height={96} className="rounded-3xl shadow-xl" />
      <h1 className="mt-5 text-2xl font-bold">Gestão de OS</h1>
      <p className="mt-2 max-w-xs text-sm text-white/80">Suas ordens de serviço, atendimentos e localização em um aplicativo no celular.</p>
      {evt ? (
        <button type="button" onClick={() => { void evt.prompt(); }} className="mt-8 w-full max-w-xs rounded-full bg-[#F7941D] px-6 py-3.5 text-base font-bold shadow-lg">Instalar aplicativo</button>
      ) : done ? <p className="mt-8 font-semibold">Aplicativo instalado!</p> : ios ? (
        <p className="mt-8 max-w-xs rounded-2xl bg-white/15 p-4 text-sm">No Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>
      ) : <p className="mt-8 max-w-xs rounded-2xl bg-white/15 p-4 text-sm">Abra o menu do navegador e escolha <b>Instalar aplicativo</b> / <b>Adicionar à tela inicial</b>.</p>}
      <Link href="/app-os" className="mt-5 text-sm font-semibold underline underline-offset-4">Abrir sem instalar</Link>
    </main>
  );
}
