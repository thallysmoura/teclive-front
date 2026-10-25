"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { osClient } from "@/lib/operacional";

/** Imagem protegida pela sessão: baixa com o cookie e exibe por URL local. */
export function AuthImage({ osId, fileId, alt, className, onClick, url }: { osId: string; fileId: string; alt: string; className?: string; onClick?: () => void; url?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let url: string | null = null; let live = true;
    setSrc(null); setFailed(false);
    if (url) { setSrc(url); return; } // foto nova: vem direto do Cloudflare R2
    osClient.imageUrl(osId, fileId).then((u) => { url = u; if (live) setSrc(u); }).catch(() => live && setFailed(true));
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [osId, fileId, url]);
  if (failed) return <span className="flex h-full min-h-24 w-full items-center justify-center bg-ds-bg px-2 text-center text-xs text-ds-text-secondary">Imagem indisponível</span>;
  if (!src) return <span className="block h-full min-h-24 w-full animate-pulse bg-ds-bg" aria-label="Carregando imagem" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} onClick={onClick} className={className} />;
}

export type LightboxItem = { name: string; src?: string; osId?: string; fileId?: string };

/**
 * Visualização ampliada: cobre toda a tela (acima de qualquer janela), imagem centralizada em tamanho
 * máximo e sem recompressão, botão de fechar no cabeçalho, setas/teclado para navegar.
 */
export function ImageLightbox({ items, index, onIndex, onClose }: { items: LightboxItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const item = items[index];
  const many = items.length > 1;
  const go = (d: number) => onIndex((index + d + items.length) % items.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
      if (many && e.key === "ArrowRight") go(1);
      if (many && e.key === "ArrowLeft") go(-1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); document.body.style.overflow = prev; };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (typeof document === "undefined" || !item) return null;
  const btn = "flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Imagem ${item.name}`} className="fixed inset-0 z-[1000] flex flex-col bg-[#05080c]/[0.98] [animation:overlay-in_160ms_ease-out_both]">
      <header className="flex shrink-0 items-center gap-3 px-4 py-3 text-white">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{item.name}{many && <span className="ml-2 font-normal text-white/60">{index + 1} de {items.length}</span>}</h2>
        {item.src && <a href={item.src} target="_blank" rel="noopener noreferrer" aria-label="Abrir original em nova aba" title="Abrir original" className={btn}><Icon name="open_in_new" className="text-[20px]" /></a>}
        <button type="button" autoFocus onClick={onClose} aria-label="Fechar imagem" title="Fechar (Esc)" className={btn}><Icon name="close" className="text-[24px]" /></button>
      </header>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        {many && <button type="button" onClick={() => go(-1)} aria-label="Imagem anterior" className={`${btn} absolute left-3 z-10 sm:left-6`}><Icon name="chevron_left" className="text-[26px]" /></button>}
        {item.src
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item.src} alt={item.name} className="max-h-full max-w-full select-none object-contain shadow-2xl" />
          : item.osId && item.fileId ? <AuthImage key={item.fileId} osId={item.osId} fileId={item.fileId} alt={item.name} className="max-h-full max-w-full select-none object-contain shadow-2xl" /> : null}
        {many && <button type="button" onClick={() => go(1)} aria-label="Próxima imagem" className={`${btn} absolute right-3 z-10 sm:right-6`}><Icon name="chevron_right" className="text-[26px]" /></button>}
      </div>
    </div>,
    document.body,
  );
}
