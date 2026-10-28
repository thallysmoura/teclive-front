"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Modal, btnGhost, btnPrimary, card, field, label } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ApiError, authFetch, listUsers, type ManagedUser } from "@/lib/api";
import { fmtDateTime } from "@/lib/operacional";

type Post = { id: string; title: string; body: string; allowComments: boolean; toAll: boolean; authorName: string; authorAvatar: string | null; createdAt: string; commentCount: number; targets?: { id: string; name: string }[] };
type Comment = { id: string; userId: string | null; userName: string; avatarUrl: string | null; text: string; createdAt: string };
type Viewer = { id: string; name: string; role: string; avatarUrl?: string | null };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível concluir a operação.");
  return body as T;
}

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
    <div className="mt-4 border-t border-ds-border-subtle pt-4">
      {!list ? <p className="text-sm text-ds-text-secondary">Carregando...</p> : (
        <ul className="space-y-3">
          {list.length === 0 && <li className="text-sm text-ds-text-secondary">Nenhum comentário ainda.</li>}
          {list.map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <UserAvatar name={c.userName} avatarUrl={c.avatarUrl} size={32} />
              <div className="min-w-0 flex-1 rounded-xl bg-ds-bg px-3 py-2">
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

function PostCard({ post, me, open, onToggle, onChanged, setPost }: { post: Post; me: Viewer; open: boolean; onToggle: () => void; onChanged: () => void; setPost: (p: Post) => void }) {
  const admin = me.role === "ADMIN";
  async function toggleComments() { await call(`/news/${post.id}`, { method: "PUT", body: JSON.stringify({ allowComments: !post.allowComments }) }); onChanged(); }
  async function remove() { if (confirm(`Excluir a notícia "${post.title}"?`)) { await call(`/news/${post.id}`, { method: "DELETE" }); onChanged(); } }
  return (
    <article id={`post-${post.id}`} className={`${card} scroll-mt-4 p-5`}>
      <header className="flex items-start gap-3">
        <UserAvatar name={post.authorName} avatarUrl={post.authorAvatar} size={42} />
        <div className="min-w-0 flex-1">
          <p className="text-sm"><b className="text-ds-primary-deep">{post.authorName}</b> <span className="text-ds-text-secondary">· {fmtDateTime(post.createdAt)}</span></p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            <span className={`rounded-full px-2 py-0.5 ${post.toAll ? "bg-[#DDF6EA] text-[#0B7A4B]" : "bg-[#FDF0DD] text-[#B45309]"}`}>{post.toAll ? "Para todos" : `Para: ${post.targets?.map((t) => t.name).join(", ") || "pessoas específicas"}`}</span>
            {admin && !post.allowComments && <span className="rounded-full bg-[#ECEFF3] px-2 py-0.5 text-[#5B6775]">Sem comentários</span>}
          </p>
        </div>
        {admin && (
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => void toggleComments()} title={post.allowComments ? "Desativar comentários" : "Ativar comentários"} aria-label="Alternar comentários" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-primary hover:border-ds-primary"><Icon name={post.allowComments ? "comments_disabled" : "forum"} className="text-[18px]" /></button>
            <button type="button" onClick={() => void remove()} title="Excluir" aria-label="Excluir notícia" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ds-border text-ds-danger-text hover:border-ds-danger-text"><Icon name="delete" className="text-[18px]" /></button>
          </div>
        )}
      </header>
      <h2 className="mt-3 text-xl font-extrabold tracking-tight text-ds-primary-deep">{post.title}</h2>
      <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ds-text">{post.body}</p>
      {(post.allowComments || post.commentCount > 0) && (
        <button type="button" onClick={onToggle} aria-expanded={open} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-ds-primary hover:underline"><Icon name="forum" className="text-[18px]" />{post.commentCount} {post.commentCount === 1 ? "comentário" : "comentários"}<Icon name={open ? "expand_less" : "expand_more"} className="text-[18px]" /></button>
      )}
      {open && <Comments post={post} me={me} onCount={(n) => setPost({ ...post, commentCount: n })} />}
    </article>
  );
}

function Composer({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [toAll, setToAll] = useState(true);
  const [allow, setAllow] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void listUsers().then(setUsers).catch(() => undefined); }, []);

  async function publish() {
    setError(""); setBusy(true);
    try { await call("/news", { method: "POST", body: JSON.stringify({ title, body, toAll, allowComments: allow, userIds: [...picked] }) }); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível publicar."); setBusy(false); }
  }
  const shown = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Modal title="Nova notícia" onClose={onClose}>
      <div className="grid gap-4">
        <label><span className={label}>Título *</span><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className={field} /></label>
        <label><span className={label}>Texto *</span><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={8000} className="w-full resize-y rounded-[10px] border border-ds-border px-3 py-2 text-sm outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" /></label>
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
      <p className="mt-3 text-xs text-ds-text-secondary">Quem receber será avisado na hora pelas notificações.</p>
      <div className="mt-4 flex gap-2"><button type="button" disabled={busy} onClick={() => void publish()} className={btnPrimary}>{busy ? "Publicando..." : "Publicar"}</button><button type="button" onClick={onClose} className={btnGhost}>Cancelar</button></div>
    </Modal>
  );
}

function Wall({ me }: { me: Viewer }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => call<Post[]>("/news").then(setPosts).catch((e) => { setError(e instanceof Error ? e.message : "Falha ao carregar."); setPosts([]); }), []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("post");
    if (!id || !posts) return;
    setOpenId(id);
    setTimeout(() => document.getElementById(`post-${id}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 150);
  }, [posts === null]); // eslint-disable-line react-hooks/exhaustive-deps
  // Notícia nova chega com a notificação em tempo real.
  useEffect(() => { const h = () => void load(); window.addEventListener("eg:notifications", h); return () => window.removeEventListener("eg:notifications", h); }, [load]);

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Mural de Notícias" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ds-primary-deep"><Icon name="campaign" className="text-[30px]" />Mural de Notícias</h1>
        {me.role === "ADMIN" && <button type="button" onClick={() => setComposer(true)} className={btnPrimary}>Nova notícia</button>}
      </header>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      <div className="space-y-4">
        {!posts && <p className="py-10 text-center text-sm text-ds-text-secondary">Carregando...</p>}
        {posts?.length === 0 && !error && (
          <div className={`${card} px-6 py-14 text-center`}><Icon name="campaign" className="text-[44px] text-ds-text-secondary" /><p className="mt-2 font-bold text-ds-primary-deep">Nenhuma notícia por enquanto</p><p className="text-sm text-ds-text-secondary">{me.role === "ADMIN" ? "Publique a primeira notícia para a equipe." : "Quando houver novidades, elas aparecem aqui."}</p></div>
        )}
        {posts?.map((p) => <PostCard key={p.id} post={p} me={me} open={openId === p.id} onToggle={() => setOpenId((c) => (c === p.id ? null : p.id))} onChanged={() => void load()} setPost={(np) => setPosts((all) => all?.map((x) => (x.id === np.id ? np : x)) ?? all)} />)}
      </div>
      {composer && <Composer onClose={() => setComposer(false)} onDone={() => { setComposer(false); void load(); }} />}
    </div>
  );
}

export default function MuralPage() {
  return <PageShell permissionKey={null}>{(user) => <Wall me={user as unknown as Viewer} />}</PageShell>;
}
