"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthImage, ImageLightbox, type LightboxItem } from "@/components/operacional/image-lightbox";
import { Icon } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cachedMe } from "@/lib/session-cache";
import { fmtDateTime, osClient, type OsComment, type OsDetail } from "@/lib/operacional";

const MAX_IMAGES = 6;
const MAX_BYTES = 2.4 * 1024 * 1024; // o servidor aceita até 3 MB por imagem
const MAX_SIDE = 2560;

/** Reduz só o necessário (lado maior 2560 px, JPEG de alta qualidade) para a foto caber no envio sem perder nitidez. */
async function shrink(file: File): Promise<{ fileName: string; mimeType: string; fileBase64: string; preview: string }> {
  const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1] ?? ""); r.onerror = () => reject(new Error("Não foi possível ler a imagem.")); r.readAsDataURL(blob); });
  const keep = file.size <= MAX_BYTES && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error(`"${file.name}" não é uma imagem válida.`); });
  if (keep && Math.max(bitmap.width, bitmap.height) <= MAX_SIDE) return { fileName: file.name, mimeType: file.type, fileBase64: await toBase64(file), preview: URL.createObjectURL(file) };
  let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  for (let quality = 0.92; ; quality -= 0.06) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.imageSmoothingQuality = "high"; ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", Math.max(quality, 0.5)));
    if (blob && blob.size <= MAX_BYTES) return { fileName: file.name.replace(/\.\w+$/, "") + ".jpg", mimeType: "image/jpeg", fileBase64: await toBase64(blob), preview: URL.createObjectURL(blob) };
    if (quality <= 0.56) { scale *= 0.85; quality = 0.92; }
  }
}

type Pending = { key: string; name: string; preview: string; fileBase64: string; mimeType: string };

function Bubble({ os, e, mine, onEdit, onDelete, onOpen }: { os: OsDetail; e: OsComment; mine: boolean; onEdit: (text: string) => Promise<void>; onDelete: () => Promise<void>; onOpen: (index: number) => void }) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(e.conteudo ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const canChange = mine && !!e.id;

  useEffect(() => {
    if (!menu) return;
    const close = (ev: MouseEvent) => { if (!box.current?.contains(ev.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  async function save() {
    setBusy(true); setError("");
    try { await onEdit(text); setEditing(false); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); } finally { setBusy(false); }
  }

  return (
    <article className="flex gap-3">
      <UserAvatar name={e.usuario} avatarUrl={e.avatarUrl} size={36} />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-ds-border-subtle bg-white px-4 py-3 shadow-sm">
        <header className="flex items-start gap-2">
          <div className="min-w-0 flex-1"><strong className="block truncate text-sm font-bold text-ds-primary-deep">{e.usuario}</strong><time dateTime={e.dataRegistro} className="text-xs text-ds-text-secondary">{fmtDateTime(e.dataRegistro)}{e.editadoEm && <span title={`Editado em ${fmtDateTime(e.editadoEm)}`}> · editado</span>}</time></div>
          {canChange && !editing && (
            <div ref={box} className="relative">
              <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Opções do comentário" className="flex h-8 w-8 items-center justify-center rounded-lg text-ds-text-secondary hover:bg-ds-bg hover:text-ds-primary"><Icon name="more_horiz" className="text-[20px]" /></button>
              {menu && (
                <ul role="menu" className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-ds-border-subtle bg-white py-1 text-sm shadow-xl">
                  <li><button role="menuitem" type="button" onClick={() => { setMenu(false); setText(e.conteudo ?? ""); setEditing(true); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-ds-bg"><Icon name="edit" className="text-[18px]" />Editar</button></li>
                  <li><button role="menuitem" type="button" onClick={() => { setMenu(false); if (confirm("Excluir este comentário? Esta ação não pode ser desfeita.")) void onDelete().catch((err) => setError(err instanceof Error ? err.message : "Não foi possível excluir.")); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-ds-danger-text hover:bg-ds-danger-bg"><Icon name="delete" className="text-[18px]" />Excluir</button></li>
                </ul>
              )}
            </div>
          )}
        </header>

        {editing ? (
          <div className="mt-2">
            <textarea value={text} autoFocus rows={3} maxLength={4000} onChange={(ev) => setText(ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Escape") { ev.stopPropagation(); setEditing(false); } if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) void save(); }} aria-label="Editar comentário" className="w-full resize-y rounded-[10px] border border-ds-border bg-white px-3 py-2 text-[15px] leading-relaxed outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" />
            <div className="mt-2 flex items-center gap-2"><button type="button" disabled={busy} onClick={() => void save()} className="h-9 rounded-lg bg-ds-primary px-4 text-sm font-bold text-white hover:bg-ds-primary-hover disabled:opacity-50">{busy ? "Salvando..." : "Salvar"}</button><button type="button" onClick={() => { setEditing(false); setError(""); }} className="h-9 rounded-lg border border-ds-border px-4 text-sm font-semibold text-ds-text-muted hover:border-ds-primary">Cancelar</button><span className="ml-auto text-[11px] text-ds-text-secondary">Ctrl+Enter salva · Esc cancela</span></div>
          </div>
        ) : e.conteudo && <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ds-text">{e.conteudo}</p>}
        {error && <p role="alert" className="mt-2 text-xs text-ds-danger-text">{error}</p>}

        {e.anexos && e.anexos.length > 0 && (
          <ul className={`mt-3 grid gap-2 ${e.anexos.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
            {e.anexos.map((a, idx) => (
              <li key={a.id} className={`overflow-hidden rounded-xl border border-ds-border-subtle bg-ds-bg ${e.anexos!.length === 1 ? "max-w-md" : "aspect-square"}`}>
                <button type="button" onClick={() => onOpen(idx)} aria-label={`Ampliar ${a.fileName}`} className="relative block h-full w-full cursor-zoom-in">
                  <AuthImage osId={os.id} fileId={a.id} alt={a.fileName} className={`w-full ${e.anexos!.length === 1 ? "max-h-80 object-contain" : "h-full object-cover"}`} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function OsComments({ os, onUpdated, tall = false }: { os: OsDetail; onUpdated: (os: OsDetail) => void; tall?: boolean }) {
  const me = cachedMe();
  const visible = (list: OsComment[]) => list.filter((e) => e.conteudo || e.anexos?.length);
  const [events, setEvents] = useState<OsComment[]>(visible(os.events));
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const input = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const lastCount = useRef(events.length);
  const editing = useRef(false);

  // Tempo real: consulta novos comentários a cada 4 s enquanto a aba está visível.
  const refresh = useCallback(() => osClient.comments(os.id).then((list) => { if (!editing.current) setEvents(visible(list)); }).catch(() => {}), [os.id]);
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 4000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (events.length > lastCount.current && stick.current) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
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
      if (area.current) area.current.style.height = "auto";
      setEvents(visible(updated.events)); onUpdated(updated);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar."); } finally { setBusy(false); area.current?.focus(); }
  }

  const apply = (updated: OsDetail) => { setEvents(visible(updated.events)); onUpdated(updated); };

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-ds-border-subtle bg-white" aria-label="Comentários">
      <h4 className="flex items-center gap-2 border-b border-ds-border-subtle px-4 py-3 text-sm font-bold text-ds-primary-deep"><Icon name="forum" className="text-[18px]" />Comentários<span className="rounded-full bg-ds-bg px-2 py-0.5 text-xs font-semibold text-ds-text-muted">{events.length}</span><span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-ds-success" title="Atualiza sozinho"><span className="h-2 w-2 animate-pulse rounded-full bg-ds-success" />ao vivo</span></h4>

      <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} className={`${tall ? "h-[min(62vh,44rem)] min-h-[18rem]" : "h-[min(26rem,52vh)] min-h-[14rem] lg:h-[min(32rem,58vh)]"} space-y-4 overflow-y-auto overscroll-contain bg-ds-bg/40 p-3 sm:p-4`}>
        {os.technicalSheet && (
          <article className="rounded-xl border border-ds-border-subtle bg-white p-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ds-primary-deep"><Icon name="description" className="text-[16px]" />Ficha técnica</p>
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ds-text-muted">{os.technicalSheet}</p>
          </article>
        )}
        {events.map((e, i) => {
          const thread: LightboxItem[] = (e.anexos ?? []).map((a) => ({ name: a.fileName, osId: os.id, fileId: a.id }));
          return (
            <Bubble key={e.id ?? i} os={os} e={e} mine={!!me && (me.role === "ADMIN" || e.usuarioId === me.id)}
              onEdit={async (t) => { editing.current = true; try { apply(await osClient.editComment(os.id, e.id!, t)); } finally { editing.current = false; } }}
              onDelete={async () => apply(await osClient.deleteComment(os.id, e.id!))}
              onOpen={(index) => setLightbox({ items: thread, index })} />
          );
        })}
        {!os.technicalSheet && events.length === 0 && <div className="flex h-full flex-col items-center justify-center gap-2 text-ds-text-secondary"><Icon name="chat_bubble" className="!text-[44px] text-ds-border" /><p className="text-sm">Nenhum comentário ainda. Seja o primeiro!</p></div>}
      </div>

      <div className={`border-t border-ds-border-subtle p-3 ${drag ? "bg-ds-primary/5" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void addFiles(e.dataTransfer.files); }}>
        {pending.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2" aria-label="Imagens a enviar">
            {pending.map((p, i) => (
              <li key={p.key} className="relative h-20 w-20 overflow-hidden rounded-lg border border-ds-border-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={p.name} className="h-full w-full cursor-zoom-in object-cover" onClick={() => setLightbox({ items: pending.map((x) => ({ name: x.name, src: x.preview })), index: i })} />
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
            placeholder="Escreva um comentário..." aria-label="Novo comentário" className="max-h-36 min-h-11 flex-1 resize-none rounded-[10px] border border-ds-border bg-white px-3.5 py-2.5 text-[15px] leading-normal outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" />
          <button type="button" onClick={() => void send()} disabled={busy || (!text.trim() && !pending.length)} aria-label="Enviar comentário" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-ds-primary text-white shadow-[0_2px_8px_-2px_rgba(0,141,255,0.5)] hover:bg-ds-primary-hover disabled:cursor-not-allowed disabled:bg-ds-border-subtle disabled:text-[#a9b6c2] disabled:shadow-none"><Icon name={busy ? "hourglass_top" : "send"} className="text-[20px]" /></button>
        </div>
        <p className="mt-1.5 hidden text-[11px] text-ds-text-secondary sm:block">Enter envia · Shift+Enter nova linha · arraste ou cole imagens (até {MAX_IMAGES})</p>
      </div>

      {lightbox && <ImageLightbox items={lightbox.items} index={lightbox.index} onIndex={(i) => setLightbox({ ...lightbox, index: i })} onClose={() => setLightbox(null)} />}
    </section>
  );
}
