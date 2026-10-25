"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";

const DISMISSED_KEY = "eg:install-dismissed";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
declare global { interface Window { __egInstall?: InstallEvent | null } }

const isMobile = () => window.matchMedia("(max-width: 767px)").matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
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
    <div role="dialog" aria-label="Instalar o aplicativo" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl border border-ds-border-subtle bg-white p-4 shadow-2xl [animation:overlay-in_220ms_ease-out_both]">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pwa/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ds-primary-deep">Instale o app da Teclive</p>
          <p className="mt-0.5 text-xs leading-snug text-ds-text-secondary">Abra direto da tela inicial do celular, sem digitar o endereço, e acompanhe tudo mais rápido.</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Fechar e não mostrar novamente" className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ds-text-secondary hover:bg-ds-bg"><Icon name="close" className="text-[20px]" /></button>
      </div>
      {help && (
        <p className="mt-3 rounded-xl bg-ds-bg px-3 py-2.5 text-xs leading-relaxed text-ds-text-muted">
          {ios ? <>No iPhone: toque em <strong>Compartilhar</strong> <Icon name="ios_share" className="align-middle text-[15px]" /> e depois em <strong>Adicionar à Tela de Início</strong>.</> : <>Abra o menu do navegador <strong>(⋮)</strong> e toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</>}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => void install()} className="btn-add inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] text-sm font-bold text-white"><Icon name="install_mobile" className="text-[20px]" />Instalar app</button>
        <button type="button" onClick={dismiss} className="h-10 rounded-[10px] border border-ds-border px-4 text-sm font-semibold text-ds-text-muted hover:border-ds-primary">Agora não</button>
      </div>
    </div>,
    document.body,
  );
}
