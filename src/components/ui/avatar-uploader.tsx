"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserAvatar } from "@/components/ui/user-avatar";
import { uploadAvatar, type Me } from "@/lib/api";

const MAX_INPUT = 12 * 1024 * 1024; // arquivo de origem aceito (a tela reduz antes de enviar)

/** Recorte quadrado centralizado, 512 px, WebP (JPEG como alternativa): leve para enviar e para carregar. */
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("Não foi possível ler essa imagem."); });
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = out; canvas.height = out;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  for (const [type, quality] of [["image/webp", 0.86], ["image/jpeg", 0.86], ["image/jpeg", 0.7]] as const) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (blob && blob.type === type && blob.size <= 480 * 1024) return blob;
  }
  throw new Error("A imagem ficou grande demais. Escolha outra.");
}

/**
 * Foto do usuário com envio: clique no ícone (canto inferior direito) ou arraste uma imagem sobre a foto.
 * Usa o mesmo tamanho do avatar; depois do envio avisa o sistema para atualizar a foto em todas as telas.
 */
export function AvatarUploader({ user, size }: { user: Me; size: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  async function send(file: File | undefined) {
    if (!file || busy) return;
    if (!file.type.startsWith("image/")) return setMessage("Escolha um arquivo de imagem.");
    if (file.size > MAX_INPUT) return setMessage("Imagem muito grande (máximo de 12 MB).");
    setBusy(true); setMessage(null);
    try {
      await uploadAvatar(await prepare(file));
      window.dispatchEvent(new Event("eg:me-updated"));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar a foto."); }
    finally { setBusy(false); }
  }

  return (
    <div className="relative inline-block"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); void send(e.dataTransfer.files[0]); }}>
      <button type="button" onClick={() => (user.avatarUrl ? setZoom(true) : input.current?.click())} aria-label={user.avatarUrl ? "Ampliar foto de perfil" : "Enviar foto de perfil"} className={`block rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${user.avatarUrl ? "cursor-zoom-in" : "cursor-pointer"} ${drag ? "scale-105" : ""} ${busy ? "opacity-60" : ""}`}><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={size} /></button>
      {drag && <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-center text-[11px] font-bold leading-tight text-white">Solte a imagem</span>}
      {busy && <span className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/40 border-t-white" /></span>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={(e) => { void send(e.target.files?.[0]); e.target.value = ""; }} />
      <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label="Enviar foto de perfil" title="Enviar foto (clique ou arraste uma imagem)"
        className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#5F6B7A] text-white transition-colors hover:bg-[#4A5461] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60 sm:h-7 sm:w-7">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 sm:h-4 sm:w-4"><path d="M21 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h4" /><path d="m3 17 5-5 4 4 2-2 3 3" /><circle cx="8.5" cy="7.5" r="1.3" /><path d="M18 11V3M14.5 6.5 18 3l3.5 3.5" /></svg>
      </button>
      {zoom && user.avatarUrl && createPortal(
        <div role="dialog" aria-label="Foto de perfil ampliada" onClick={() => setZoom(false)} className="fixed inset-0 z-[70] flex cursor-zoom-out items-center justify-center bg-black/80 p-6 backdrop-blur-sm [animation:overlay-in_180ms_ease-out_both]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.avatarUrl} alt={user.name} draggable={false} className="max-h-[85vh] max-w-[90vw] select-none rounded-3xl object-contain shadow-2xl" />
        </div>,
        document.body,
      )}
      {message && <p role="alert" className="absolute left-1/2 top-full z-20 mt-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-ds-danger px-2.5 py-1.5 text-center text-xs font-medium text-white shadow-lg">{message}</p>}
    </div>
  );
}
