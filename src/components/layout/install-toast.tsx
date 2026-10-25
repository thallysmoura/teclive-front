"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";

const DISMISSED_KEY = "eg:install-dismissed";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
declare global { interface Window { __egInstall?: InstallEvent | null } }

// Só aparelhos móveis (celular/tablet): navegador de computador com a janela estreita não conta.
const isMobile = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || (window.matchMedia("(pointer: coarse)").matches && navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
const isInstalled = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const wasDismissed = () => { try { return localStorage.getItem(DISMISSED_KEY) === "1"; } catch { return false; } };

/**
 * Aviso para instalar o app no celular. Aparece na Visão Geral (depois do login), só em celular, só se o app ainda não estiver
 * instalado e some para sempre quando a pessoa fecha ou instala.
 */
export function InstallToast() {
  const [visible, setVisible] = useState(false);
  const [help, setHelp] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (!isMobile() || isInstalled() || wasDismissed()) return;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const timer = setTimeout(() => setVisible(true), 1200); // entra depois que a tela carregou
    const onInstalled = () => { dismiss(); };
    window.addEventListener("appinstalled", onInstalled);
    return () => { clearTimeout(timer); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* sem armazenamento: some só nesta visita */ }
    setVisible(false);
  }

  async function install() {
    const event = window.__egInstall;
    if (!event) { setHelp(true); return; } // iPhone/Safari ou navegador sem instalação direta: mostra o passo a passo
    await event.prompt();
    const choice = await event.userChoice;
    window.__egInstall = null;
    if (choice.outcome === "accepted") dismiss(); else setHelp(false);
  }

  if (!visible) return null;
  // Portal no <body>: um ancestral com transform (animação de entrada da página) quebraria o position: fixed.
  return createPortal(
    <div role="dialog" data-no-capture aria-label="Instalar o aplicativo" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-[28px] border border-white/80 bg-gradient-to-b from-white to-[#EEF3FB] p-4 shadow-[0_24px_60px_-12px_rgba(7,32,70,0.45)] [animation:overlay-in_220ms_ease-out_both]">
      <div className="flex items-start gap-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pwa/icon-192.png?v=2" alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-[18px] shadow-md" />
        <div className="min-w-0 flex-1">
          <p className="text-[19px] font-extrabold leading-tight tracking-tight text-[#0E2A4D]">Instale o app da Teclive</p>
          <p className="mt-1 text-[13.5px] leading-snug text-[#7A869C]">Abra direto da tela inicial do celular, sem digitar o endereço, e acompanhe tudo mais rápido.</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Fechar e não mostrar novamente" className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#7A869C] hover:bg-black/5"><Icon name="close" className="text-[24px]" /></button>
      </div>
      {help && (
        <p className="mt-3 rounded-2xl bg-white/70 px-3.5 py-3 text-[13px] leading-relaxed text-[#4F5D75]">
          {ios ? <>No iPhone: toque em <strong>Compartilhar</strong> <Icon name="ios_share" className="align-middle text-[16px]" /> e depois em <strong>Adicionar à Tela de Início</strong>.</> : <>Abra o menu do navegador <strong>(⋮)</strong> e toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</>}
        </p>
      )}
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => void install()} className="inline-flex h-12 flex-[1.6] items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#13A869] to-[#0A8B50] text-base font-bold text-white shadow-[0_8px_18px_-6px_rgba(10,139,80,0.6)] transition-transform active:scale-[0.98]"><Icon name="download" className="text-[24px]" />Instalar app</button>
        <button type="button" onClick={dismiss} className="h-12 flex-1 rounded-2xl border border-[#CBD5E5] bg-white/60 text-base font-bold text-[#5A6A85] transition-colors hover:bg-white">Agora não</button>
      </div>
    </div>,
    document.body,
  );
}
