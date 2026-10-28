"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Modal, btnGhost, btnPrimary, field, label } from "@/components/contratos/admin-ui";
import { ImageLightbox } from "@/components/operacional/image-lightbox";
import { Icon } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ApiError, authFetch, listUsers, type ManagedUser } from "@/lib/api";
import { fmtDateTime } from "@/lib/operacional";

type Post = { id: string; title: string; body: string; imageUrl: string | null; allowComments: boolean; toAll: boolean; authorName: string; authorAvatar: string | null; createdAt: string; commentCount: number; targets?: { id: string; name: string }[] };
type Comment = { id: string; userId: string | null; userName: string; avatarUrl: string | null; text: string; createdAt: string };
type Viewer = { id: string; name: string; role: string; avatarUrl?: string | null };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível concluir a operação.");
  return body as T;
}

/** Reduz a imagem para no máximo 1600 px (JPEG) antes de enviar para o Cloudflare R2. */
async function shrink(file: File): Promise<{ fileName: string; fileBase64: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const q of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= 2.4 * 1024 * 1024) {
      const preview = URL.createObjectURL(blob);
      const fileBase64 = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
      return { fileName: file.name, fileBase64, preview };
    }
  }
  throw new ApiError("A imagem é muito grande mesmo reduzida. Envie uma menor.");
}

const cardCls = "overflow-hidden rounded-2xl border border-ds-border-subtle bg-white shadow-sm";

function Comments({ post, me, onCount }: { post: Post; me: Viewer; onCount: (n: number) => void }) {
  const [list, setList] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { void call<Comment[]>(`/news/${post.id}/comments`).then((l) => { setList(l); onCount(l.length); }).catch(() => setList([])); }, [post.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    setError("");
    try {
      const c = await call<Comment>(`/news/${post.id}/comments`, { method: "POST", body: JSON.stringify({ text }) });
      setList((l) => { const n = [...(l ?? []), c]; onCount(n.length); return n; }); setText("");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível comentar."); }
  }
  async function remove(c: Comment) {
    if (!confirm("Excluir este comentário?")) return;
    try { await call(`/news/${post.id}/comments/${c.id}`, { method: "DELETE" }); setList((l) => { const n = (l ?? []).filter((x) => x.id !== c.id); onCount(n.length); return n; }); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível excluir."); }
  }

  return (
    <div className="border-t border-ds-border-subtle bg-ds-bg/60 px-5 py-4">
      {!list ? <p className="text-sm text-ds-text-secondary">Carregando...</p> : (
        <ul className="space-y-3">
          {list.length === 0 && <li className="text-sm text-ds-text-secondary">Nenhum comentário ainda.</li>}
          {list.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <UserAvatar name={c.userName} avatarUrl={c.avatarUrl} size={32} />
              <div className="min-w-0 flex-1 rounded-xl border border-ds-border-subtle bg-white px-3 py-2">
                <p className="text-xs"><b className="text-ds-primary-deep">{c.userName}</b> <span className="text-ds-text-secondary">· {fmtDateTime(c.createdAt)}</span></p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ds-text">{c.text}</p>
              </div>
              {(me.role === "ADMIN" || c.userId === me.id) && <button type="button" onClick={() => void remove(c)} aria-label="Excluir comentário" className="self-start text-ds-text-secondary hover:text-ds-danger-text"><Icon name="delete" className="text-[18px]" /></button>}
            </li>
          ))}
        </ul>
      )}
      {post.allowComments ? (
        <div className="mt-3 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) void send(); }} maxLength={1000} placeholder="Escreva um comentário..." className={field} />
          <button type="button" disabled={!text.trim()} onClick={() => void send()} className={btnPrimary}>Enviar</button>
        </div>
      ) : <p className="mt-3 text-xs text-ds-text-secondary">Os comentários estão desativados nesta notícia.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-ds-danger-text">{error}</p>}
    </div>
  );
}

function PostCard({ post, me, open, onToggle, onEdit, onChanged, setPost }: { post: Post; me: Viewer; open: boolean; onToggle: () => void; onEdit: () => void; onChanged: () => void; setPost: (p: Post) => void }) {
  const admin = me.role === "ADMIN";
  const [zoom, setZoom] = useState(false);
  async function remove() {
    if (!confirm(`Excluir a notícia "${post.title}"? Esta ação não pode ser desfeita.`)) return;
    try { await call(`/news/${post.id}`, { method: "DELETE" }); onChanged(); } catch (e) { alert(e instanceof Error ? e.message : "Não foi possível excluir."); }
  }
  return (
    <article id={`post-${post.id}`} className={`${cardCls} scroll-mt-4`}>
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <button type="button" onClick={() => setZoom(true)} aria-label="Ampliar imagem" className="block w-full cursor-zoom-in bg-ds-bg"><img src={post.imageUrl} alt={post.title} className="max-h-[420px] w-full object-cover" /></button>
      )}
      <div className="border-l-4 border-[#F7941D] p-5">
        <header className="flex items-start gap-3">
          <UserAvatar name={post.authorName} avatarUrl={post.authorAvatar} size={42} />
          <div className="min-w-0 flex-1">
            <p className="text-sm"><b className="text-ds-primary-deep">{post.authorName}</b> <span className="text-ds-text-secondary">· {fmtDateTime(post.createdAt)}</span></p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              <span className={`rounded-full px-2 py-0.5 ${post.toAll ? "bg-[#DDF6EA] text-[#0B7A4B]" : "bg-[#FDF0DD] text-[#B45309]"}`}>{post.toAll ? "Para todos" : `Para: ${post.targets?.map((t) => t.name).join(", ") || "pessoas específicas"}`}</span>
              {admin && !post.allowComments && <span className="rounded-full bg-[#ECEFF3] px-2 py-0.5 text-[#5B6775]">Sem comentários</span>}
            </p>
          </div>
          {admin && (
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={onEdit} title="Editar" aria-label="Editar notícia" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-primary hover:border-ds-primary"><Icon name="edit_square" className="text-[18px]" /></button>
              <button type="button" onClick={() => void remove()} title="Excluir" aria-label="Excluir notícia" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-danger-text hover:border-ds-danger-text"><Icon name="delete" className="text-[18px]" /></button>
            </div>
          )}
        </header>
        <h2 className="mt-3 text-xl font-extrabold tracking-tight text-ds-primary-deep">{post.title}</h2>
        <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ds-text">{post.body}</p>
        {(post.allowComments || post.commentCount > 0) && (
          <button type="button" onClick={onToggle} aria-expanded={open} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-ds-primary hover:underline"><Icon name="forum" className="text-[18px]" />{post.commentCount} {post.commentCount === 1 ? "comentário" : "comentários"}<Icon name={open ? "expand_less" : "expand_more"} className="text-[18px]" /></button>
        )}
      </div>
      {open && <Comments post={post} me={me} onCount={(n) => setPost({ ...post, commentCount: n })} />}
      {zoom && post.imageUrl && <ImageLightbox items={[{ name: post.title, src: post.imageUrl }]} index={0} onIndex={() => undefined} onClose={() => setZoom(false)} />}
    </article>
  );
}

function Composer({ editing, onClose, onDone }: { editing: Post | null; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [toAll, setToAll] = useState(editing?.toAll ?? true);
  const [allow, setAllow] = useState(editing?.allowComments ?? true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set(editing?.targets?.map((t) => t.id) ?? []));
  const [q, setQ] = useState("");
  const [image, setImage] = useState<{ fileName: string; fileBase64: string; preview: string } | null>(null);
  const [keepImage, setKeepImage] = useState(!!editing?.imageUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { void listUsers().then(setUsers).catch(() => undefined); }, []);

  async function pick(f: File | undefined) {
    if (!f) return;
    setError("");
    try { setImage(await shrink(f)); setKeepImage(false); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível usar a imagem."); }
    if (file.current) file.current.value = "";
  }

  async function publish() {
    setError(""); setBusy(true);
    try {
      const payload = { title, body, toAll, allowComments: allow, userIds: [...picked], ...(image ? { image: { fileName: image.fileName, fileBase64: image.fileBase64 } } : {}), ...(editing && !image && !keepImage && editing.imageUrl ? { removeImage: true } : {}) };
      if (editing) await call(`/news/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await call("/news", { method: "POST", body: JSON.stringify(payload) });
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível publicar."); setBusy(false); }
  }
  const shown = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  const preview = image?.preview ?? (keepImage ? editing?.imageUrl ?? null : null);

  return (
    <Modal title={editing ? "Editar notícia" : "Nova notícia"} onClose={onClose}>
      <div className="grid gap-4">
        <label><span className={label}>Título *</span><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className={field} /></label>
        <label><span className={label}>Texto *</span><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={8000} className="w-full resize-y rounded-[10px] border border-ds-border px-3 py-2 text-sm outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" /></label>
        <div>
          <span className={label}>Imagem (opcional)</span>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void pick(e.target.files?.[0])} />
          {preview ? (
            <div className="relative overflow-hidden rounded-xl border border-ds-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Imagem da notícia" className="max-h-52 w-full object-cover" />
              <div className="absolute right-2 top-2 flex gap-1.5">
                <button type="button" onClick={() => file.current?.click()} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/95 px-2.5 text-xs font-bold text-ds-primary-deep shadow"><Icon name="swap_horiz" className="text-[16px]" />Trocar</button>
                <button type="button" onClick={() => { setImage(null); setKeepImage(false); }} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/95 px-2.5 text-xs font-bold text-ds-danger-text shadow"><Icon name="delete" className="text-[16px]" />Remover</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => file.current?.click()} className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ds-border text-sm font-semibold text-ds-primary hover:border-ds-primary hover:bg-ds-bg"><Icon name="add_photo_alternate" className="text-[28px]" />Anexar imagem</button>
          )}
        </div>
        <div>
          <span className={label}>Quem vai receber</span>
          <div className="flex gap-2">
            {[{ v: true, t: "Todos", i: "groups" }, { v: false, t: "Pessoas específicas", i: "person" }].map((o) => <button key={String(o.v)} type="button" onClick={() => setToAll(o.v)} aria-pressed={toAll === o.v} className={`inline-flex h-10 items-center gap-1.5 rounded-[10px] border px-3 text-sm font-bold ${toAll === o.v ? "border-ds-primary bg-ds-primary text-white" : "border-ds-border bg-white text-ds-primary-deep"}`}><Icon name={o.i} className="text-[18px]" />{o.t}</button>)}
          </div>
          {!toAll && (
            <div className="mt-2 rounded-xl border border-ds-border-subtle p-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pessoa" className="mb-2 h-9 w-full rounded-lg border border-ds-border px-3 text-sm outline-none focus:border-ds-primary" />
              <ul className="max-h-44 overflow-y-auto">
                {shown.map((u) => <li key={u.id}><label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ds-bg"><input type="checkbox" checked={picked.has(u.id)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(u.id); else n.delete(u.id); return n; })} className="h-4 w-4 accent-[#005CD2]" /><UserAvatar name={u.name} avatarUrl={u.avatarUrl} size={24} /><span className="min-w-0 truncate">{u.name}</span></label></li>)}
              </ul>
              <p className="mt-1 text-xs text-ds-text-secondary">{picked.size} selecionada(s)</p>
            </div>
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ds-primary-deep"><input type="checkbox" checked={allow} onChange={(e) => setAllow(e.target.checked)} className="h-4 w-4 accent-[#005CD2]" />Aceitar comentários nesta notícia</label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
      <p className="mt-3 text-xs text-ds-text-secondary">{editing ? "Quem for incluído agora será avisado na hora pelas notificações." : "Quem receber será avisado na hora pelas notificações."}</p>
      <div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={() => void publish()} className={btnPrimary}>{busy ? "Salvando..." : editing ? "Salvar alterações" : "Publicar"}</button><button type="button" onClick={onClose} className={btnGhost}>Cancelar</button></div>
    </Modal>
  );
}

function Wall({ me }: { me: Viewer }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [composer, setComposer] = useState<Post | "new" | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => call<Post[]>("/news").then(setPosts).catch((e) => { setError(e instanceof Error ? e.message : "Falha ao carregar."); setPosts([]); }), []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("post");
    if (!id || !posts) return;
    setOpenId(id);
    setTimeout(() => document.getElementById(`post-${id}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 150);
  }, [posts === null]); // eslint-disable-line react-hooks/exhaustive-deps
  // Notícia nova chega junto com a notificação em tempo real.
  useEffect(() => { const h = () => void load(); window.addEventListener("eg:notifications", h); return () => window.removeEventListener("eg:notifications", h); }, [load]);

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Mural de Notícias" }]} />
      <header className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-ds-primary-deep to-ds-primary px-5 py-5 text-white shadow-sm md:px-7 md:py-6">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15"><Icon name="campaign" className="text-[30px]" /></span>
            <div><h1 className="text-2xl font-extrabold tracking-tight">Mural de Notícias</h1><p className="text-sm text-white/80">Comunicados e novidades da Teclive para a equipe.</p></div>
          </div>
          {me.role === "ADMIN" && <button type="button" onClick={() => setComposer("new")} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[#F7941D] px-4 text-sm font-bold text-white shadow hover:bg-[#E5850F]"><Icon name="add" className="text-[20px]" />Nova notícia</button>}
        </div>
      </header>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      <div className="space-y-4">
        {!posts && <p className="py-10 text-center text-sm text-ds-text-secondary">Carregando...</p>}
        {posts?.length === 0 && !error && (
          <div className={`${cardCls} px-6 py-14 text-center`}><Icon name="campaign" className="text-[44px] text-ds-text-secondary" /><p className="mt-2 font-bold text-ds-primary-deep">Nenhuma notícia por enquanto</p><p className="text-sm text-ds-text-secondary">{me.role === "ADMIN" ? "Publique a primeira notícia para a equipe." : "Quando houver novidades, elas aparecem aqui."}</p></div>
        )}
        {posts?.map((p) => <PostCard key={p.id} post={p} me={me} open={openId === p.id} onToggle={() => setOpenId((c) => (c === p.id ? null : p.id))} onEdit={() => setComposer(p)} onChanged={() => void load()} setPost={(np) => setPosts((all) => all?.map((x) => (x.id === np.id ? np : x)) ?? all)} />)}
      </div>
      {composer && <Composer editing={composer === "new" ? null : composer} onClose={() => setComposer(null)} onDone={() => { setComposer(null); void load(); }} />}
    </div>
  );
}

export default function MuralPage() {
  return <PageShell permissionKey={null}>{(user) => <Wall me={user as unknown as Viewer} />}</PageShell>;
}
