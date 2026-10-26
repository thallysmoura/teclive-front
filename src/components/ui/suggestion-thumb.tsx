"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { fetchSuggestionImage } from "@/lib/suggestions";

/** Miniatura da captura de uma sugestão: baixa a imagem (guardada no banco) com a sessão e abre ampliada ao clicar. */
export function SuggestionThumb({ id, legacyUrl, hasImage, className, onOpen }: { id: string; legacyUrl?: string | null; hasImage: boolean; className: string; onOpen: (src: string) => void }) {
  const [src, setSrc] = useState<string | null>(legacyUrl ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (legacyUrl || !hasImage) return;
    let url: string | null = null;
    let live = true;
    fetchSuggestionImage(id).then((u) => { url = u; if (live) setSrc(u); }).catch(() => live && setFailed(true));
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [id, legacyUrl, hasImage]);

  if (!hasImage || failed) return <span className={`flex items-center justify-center rounded-xl bg-ds-bg text-ds-text-secondary ${className}`}><Icon name="image_not_supported" className="text-[24px]" /></span>;
  if (!src) return <span className={`animate-pulse rounded-xl bg-ds-bg ${className}`} aria-label="Carregando imagem" />;
  return (
    <button type="button" onClick={() => onOpen(src)} aria-label="Ampliar imagem" className={`cursor-zoom-in overflow-hidden rounded-xl border border-ds-border-subtle ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover object-top" />
    </button>
  );
}
