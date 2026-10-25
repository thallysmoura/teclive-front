"use client";

import { useRef, useState } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { removeAvatar, uploadAvatar, type Me } from "@/lib/api";

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

  async function remove() {
    if (busy || !confirm("Remover a sua foto de perfil?")) return;
    setBusy(true); setMessage(null);
    try { await removeAvatar(); window.dispatchEvent(new Event("eg:me-updated")); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível remover."); } finally { setBusy(false); }
  }

  return (
    <div className="relative inline-block"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); void send(e.dataTransfer.files[0]); }}>
      <div className={`rounded-full transition-all ${drag ? "scale-105 ring-4 ring-white/80" : ""} ${busy ? "opacity-60" : ""}`}><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={size} /></div>
      {drag && <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-center text-[11px] font-bold leading-tight text-white">Solte a imagem</span>}
      {busy && <span className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/40 border-t-white" /></span>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={(e) => { void send(e.target.files?.[0]); e.target.value = ""; }} />
      <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label="Enviar foto de perfil" title="Enviar foto (clique ou arraste uma imagem)"
        className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-ds-primary text-white shadow-lg transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60 sm:h-9 sm:w-9">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] sm:h-[19px] sm:w-[19px]"><path d="M12 16V5M7.5 9.5 12 5l4.5 4.5" /><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>
      </button>
      {user.avatarUrl && !busy && <button type="button" onClick={() => void remove()} aria-label="Remover foto de perfil" title="Remover foto" className="absolute -left-1 -top-1 hidden h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-black/60 text-white hover:bg-black group-hover:flex sm:flex"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-3 w-3"><path d="M6 6l12 12M18 6 6 18" /></svg></button>}
      {message && <p role="alert" className="absolute left-1/2 top-full z-20 mt-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-ds-danger px-2.5 py-1.5 text-center text-xs font-medium text-white shadow-lg">{message}</p>}
    </div>
  );
}
