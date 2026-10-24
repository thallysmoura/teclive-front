"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { UserAvatar } from "@/components/ui/user-avatar";
import { fmtDateTime, osClient, type OsComment, type OsDetail } from "@/lib/operacional";

const MAX_IMAGES = 6;
const MAX_BYTES = 480 * 1024;

/** Reduz a imagem no navegador (lado maior 1600 px, JPEG) para caber no envio. GIFs seguem como estão se forem pequenos. */
async function shrink(file: File): Promise<{ fileName: string; mimeType: string; fileBase64: string; preview: string }> {
  const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1] ?? ""); r.onerror = () => reject(new Error("Não foi possível ler a imagem.")); r.readAsDataURL(blob); });
  if (file.type === "image/gif" && file.size <= MAX_BYTES) return { fileName: file.name, mimeType: file.type, fileBase64: await toBase64(file), preview: URL.createObjectURL(file) };
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error(`"${file.name}" não é uma imagem válida.`); });
  let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  for (let quality = 0.85; ; quality -= 0.1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", Math.max(quality, 0.4)));
    if (blob && (blob.size <= MAX_BYTES || (quality <= 0.45 && scale < 0.35))) return { fileName: file.name.replace(/\.\w+$/, "") + ".jpg", mimeType: "image/jpeg", fileBase64: await toBase64(blob), preview: URL.createObjectURL(blob) };
    if (quality <= 0.45) scale *= 0.75;
  }
}

/** Imagem protegida pela sessão: baixa com o cookie e exibe por URL local. */
function AuthImage({ osId, fileId, alt, className, onClick }: { osId: string; fileId: string; alt: string; className?: string; onClick?: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let url: string | null = null; let live = true;
    osClient.imageUrl(osId, fileId).then((u) => { url = u; if (live) setSrc(u); }).catch(() => live && setFailed(true));
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [osId, fileId]);
  if (failed) return <span className="flex h-full w-full items-center justify-center bg-ds-bg text-xs text-ds-text-secondary">Imagem indisponível</span>;
  if (!src) return <span className="block h-full w-full animate-pulse bg-ds-bg" aria-label="Carregando imagem" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} onClick={onClick} className={className} />;
}

type Pending = { key: string; name: string; preview: string; fileBase64: string; mimeType: string };

export function OsComments({ os, onUpdated }: { os: OsDetail; onUpdated: (os: OsDetail) => void }) {
  const [events, setEvents] = useState<OsComment[]>(os.events.filter((e) => e.conteudo || e.anexos?.length));
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<{ files: { id: string; fileName: string }[]; index: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const input = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const lastCount = useRef(events.length);

  // Tempo real: consulta novos comentários a cada 4 s enquanto a aba está visível.
  const refresh = useCallback(() => osClient.comments(os.id).then((list) => setEvents(list.filter((e) => e.conteudo || e.anexos?.length))).catch(() => {}), [os.id]);
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 4000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => { // mantém o fim da conversa visível quando chega comentário novo e a pessoa já estava embaixo
    if (events.length !== lastCount.current && stick.current) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    lastCount.current = events.length;
  }, [events]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, []);
  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function addFiles(list: FileList | File[]) {
    const images = [...list].filter((f) => f.type.startsWith("image/"));
    if (!images.length) return setError("Escolha arquivos de imagem.");
    setError("");
    const room = MAX_IMAGES - pending.length;
    if (images.length > room) setError(`No máximo ${MAX_IMAGES} imagens por comentário.`);
    try {
      const done = await Promise.all(images.slice(0, Math.max(room, 0)).map(async (f) => { const s = await shrink(f); return { key: crypto.randomUUID(), name: s.fileName, preview: s.preview, fileBase64: s.fileBase64, mimeType: s.mimeType }; }));
      setPending((p) => [...p, ...done]);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível preparar a imagem."); }
  }

  async function send() {
    if (busy || (!text.trim() && !pending.length)) return;
    setBusy(true); setError("");
    try {
      const ids = [];
      for (const p of pending) ids.push((await osClient.uploadImage(os.id, { fileName: p.name, mimeType: p.mimeType, fileBase64: p.fileBase64 })).id);
      const updated = await osClient.comment(os.id, { text, fileIds: ids });
      pending.forEach((p) => URL.revokeObjectURL(p.preview));
      setText(""); setPending([]); stick.current = true;
      setEvents(updated.events.filter((e) => e.conteudo || e.anexos?.length));
      onUpdated(updated);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar."); } finally { setBusy(false); area.current?.focus(); }
  }

  const lb = lightbox;
  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-ds-border-subtle bg-white" aria-label="Comentários">
      <h4 className="flex items-center gap-2 border-b border-ds-border-subtle px-4 py-3 text-sm font-bold text-ds-primary-deep"><Icon name="forum" className="text-[18px]" />Comentários e Atendimentos<span className="ml-auto rounded-full bg-ds-bg px-2 py-0.5 text-xs font-semibold text-ds-text-muted">{events.length}</span><span className="flex items-center gap-1 text-[11px] font-medium text-ds-success" title="Atualiza sozinho"><span className="h-2 w-2 animate-pulse rounded-full bg-ds-success" />ao vivo</span></h4>

      <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} className="h-[min(28rem,55vh)] min-h-[16rem] space-y-4 overflow-y-auto overscroll-contain bg-ds-bg/40 p-4 lg:h-[min(34rem,60vh)]">
        {os.technicalSheet && (
          <article className="rounded-xl border border-ds-border-subtle bg-white p-3.5 text-sm">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ds-primary-deep"><Icon name="description" className="text-[16px]" />Ficha técnica</p>
            <p className="whitespace-pre-wrap break-words text-ds-text-muted">{os.technicalSheet}</p>
          </article>
        )}
        {events.map((e, i) => (
          <article key={e.id ?? i} className="flex gap-3">
            <UserAvatar name={e.usuario} avatarUrl={e.avatarUrl} size={36} />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-ds-border-subtle bg-white px-3.5 py-2.5 shadow-sm">
              <header className="flex flex-wrap items-baseline gap-x-2"><strong className="text-sm text-ds-primary-deep">{e.usuario}</strong><time dateTime={e.dataRegistro} className="text-xs text-ds-text-secondary">{fmtDateTime(e.dataRegistro)}</time></header>
              {e.conteudo && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ds-text">{e.conteudo}</p>}
              {e.anexos && e.anexos.length > 0 && (
                <ul className={`mt-2 grid gap-2 ${e.anexos.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
                  {e.anexos.map((a, idx) => (
                    <li key={a.id} className={`overflow-hidden rounded-lg border border-ds-border-subtle bg-ds-bg ${e.anexos!.length === 1 ? "max-w-sm" : "aspect-square"}`}>
                      <button type="button" onClick={() => setLightbox({ files: e.anexos!, index: idx })} aria-label={`Ampliar ${a.fileName}`} className="block h-full w-full cursor-zoom-in">
                        <AuthImage osId={os.id} fileId={a.id} alt={a.fileName} className={`w-full ${e.anexos!.length === 1 ? "max-h-72 object-contain" : "h-full object-cover"}`} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        ))}
        {!os.technicalSheet && events.length === 0 && <div className="flex h-full flex-col items-center justify-center gap-2 text-ds-text-secondary"><Icon name="chat_bubble" className="!text-[44px] text-ds-border" /><p className="text-sm">Nenhum comentário ainda. Seja o primeiro!</p></div>}
      </div>

      <div className={`border-t border-ds-border-subtle p-3 ${drag ? "bg-ds-primary/5" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void addFiles(e.dataTransfer.files); }}>
        {pending.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2" aria-label="Imagens a enviar">
            {pending.map((p) => (
              <li key={p.key} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-ds-border-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={p.name} className="h-full w-full cursor-zoom-in object-cover" onClick={() => setLightbox({ files: pending.map((x) => ({ id: x.key, fileName: x.name })), index: pending.indexOf(p) })} />
                <button type="button" onClick={() => { URL.revokeObjectURL(p.preview); setPending((l) => l.filter((x) => x.key !== p.key)); }} aria-label={`Remover ${p.name}`} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black"><Icon name="close" className="text-[14px]" /></button>
              </li>
            ))}
          </ul>
        )}
        {error && <p role="alert" className="mb-2 text-xs text-ds-danger-text">{error}</p>}
        <div className="flex items-end gap-2">
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
          <button type="button" onClick={() => input.current?.click()} disabled={pending.length >= MAX_IMAGES} aria-label="Anexar imagem" title="Anexar imagem" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-ds-border text-ds-text-muted hover:border-ds-primary hover:text-ds-primary disabled:opacity-40"><Icon name="image" className="text-[22px]" /></button>
          <textarea ref={area} value={text} rows={1} maxLength={4000} onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            onPaste={(e) => { const files = [...e.clipboardData.files]; if (files.some((f) => f.type.startsWith("image/"))) { e.preventDefault(); void addFiles(files); } }}
            placeholder="Escreva um comentário ou cole uma imagem..." aria-label="Novo comentário" className="max-h-36 min-h-11 flex-1 resize-none rounded-[10px] border border-ds-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" />
          <button type="button" onClick={() => void send()} disabled={busy || (!text.trim() && !pending.length)} aria-label="Enviar comentário" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-ds-primary text-white shadow-[0_2px_8px_-2px_rgba(0,141,255,0.5)] hover:bg-ds-primary-hover disabled:cursor-not-allowed disabled:bg-ds-border-subtle disabled:text-[#a9b6c2] disabled:shadow-none"><Icon name={busy ? "hourglass_top" : "send"} className="text-[20px]" /></button>
        </div>
        <p className="mt-1.5 text-[11px] text-ds-text-secondary">Enter envia · Shift+Enter quebra a linha · arraste ou cole imagens (até {MAX_IMAGES})</p>
      </div>

      {lb && (
        <Modal open onClose={() => setLightbox(null)} wide labelledBy="lightbox-title">
          <div className="flex max-h-[92vh] flex-col bg-black/90">
            <header className="flex items-center justify-between px-4 py-2 text-white"><h2 id="lightbox-title" className="truncate text-sm font-semibold">{lb.files[lb.index].fileName} <span className="text-white/60">({lb.index + 1}/{lb.files.length})</span></h2><button type="button" onClick={() => setLightbox(null)} aria-label="Fechar visualização" className="rounded p-1 hover:bg-white/15"><Icon name="close" className="text-[22px]" /></button></header>
            <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
              {lb.files.length > 1 && <button type="button" onClick={() => setLightbox({ ...lb, index: (lb.index - 1 + lb.files.length) % lb.files.length })} aria-label="Imagem anterior" className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/35"><Icon name="chevron_left" /></button>}
              <div className="flex max-h-[80vh] w-full items-center justify-center">
                {pending.some((p) => p.key === lb.files[lb.index].id)
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={pending.find((p) => p.key === lb.files[lb.index].id)!.preview} alt={lb.files[lb.index].fileName} className="max-h-[80vh] max-w-full object-contain" />
                  : <AuthImage key={lb.files[lb.index].id} osId={os.id} fileId={lb.files[lb.index].id} alt={lb.files[lb.index].fileName} className="max-h-[80vh] max-w-full object-contain" />}
              </div>
              {lb.files.length > 1 && <button type="button" onClick={() => setLightbox({ ...lb, index: (lb.index + 1) % lb.files.length })} aria-label="Próxima imagem" className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/35"><Icon name="chevron_right" /></button>}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
