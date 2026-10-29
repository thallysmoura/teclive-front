"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { ApiError, authFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/operacional";

type Kind = "point" | "ok" | "x";
type Point = { id: string; number: number; x: number; y: number; kind: Kind; label?: string | null; description: string; done: boolean; userName: string; createdAt: string };
type Stroke = { id: string; color: string; points: number[][]; userName: string };
type CheckItem = { id: string; text: string; done: boolean; doneBy: string | null };
type Checklist = { id: string; title: string; userName: string; items: CheckItem[] };
type Plan = { id: string; title: string; fileUrl: string; userName: string; createdAt: string; points: Point[]; strokes: Stroke[]; checklists: Checklist[] };
const NAME_HINTS = "Sugestões: Infraestrutura, Instalação, Elétrica, Rede, CFTV";
const KINDS: { key: Kind; label: string; icon: string; bg: string }[] = [
  { key: "point", label: "Ponto", icon: "location_on", bg: "#F7941D" },
  { key: "ok", label: "OK", icon: "check", bg: "#12A262" },
  { key: "x", label: "Objeção", icon: "close", bg: "#E11D48" },
];
const kindOf = (k: Kind) => KINDS.find((x) => x.key === k) ?? KINDS[0];
/** Marca "X" da objeção: traço vermelho grosso com contorno branco, para ler sobre qualquer planta. */
function ObjectionMark({ size = 30, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={`drop-shadow-lg ${active ? "scale-125" : ""}`}>
      <path d="M6 6 L26 26 M26 6 L6 26" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <path d="M6 6 L26 26 M26 6 L6 26" stroke="#E11D48" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
const COLORS = ["#E11D48", "#005CD2", "#12A262", "#111827"];

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível concluir a operação.");
  return body as T;
}

/** Reduz a planta para no máximo 2400 px (JPEG) antes de enviar para o Cloudflare R2. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const q of [0.88, 0.75, 0.6, 0.5]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= 2.4 * 1024 * 1024) return await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
  }
  throw new ApiError("A imagem é muito grande mesmo reduzida. Envie uma menor.");
}

function PlanChecklists({ osId, plan, onChange }: { osId: string; plan: Plan; onChange: () => void }) {
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const base = `/service-orders/${osId}/plans/${plan.id}/checklists`;
  const run = async (fn: () => Promise<unknown>) => { setError(""); try { await fn(); onChange(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir."); } };
  const create = () => { const title = window.prompt("Nome do checklist (ex.: Infraestrutura, Instalação):"); if (title?.trim()) void run(() => call(base, { method: "POST", body: JSON.stringify({ title }) })); };
  return (
    <section className="mt-4 rounded-xl border border-ds-border-subtle bg-white">
      <header className="flex flex-wrap items-center gap-2 border-b border-ds-border-subtle px-4 py-3"><Icon name="checklist" className="text-[22px] text-[#F7941D]" /><h5 className="text-sm font-bold text-ds-primary-deep">Checklists da planta ({plan.checklists.length})</h5><button type="button" onClick={create} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#F7941D] px-3 text-sm font-bold text-white hover:bg-[#E5850F]"><Icon name="add" className="text-[18px]" />Novo checklist</button></header>
      {error && <p role="alert" className="mx-4 mt-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      {plan.checklists.length === 0 ? <p className="px-4 py-6 text-center text-sm text-ds-text-secondary">Nenhum checklist nesta planta. Crie um para acompanhar o que falta fazer.</p> : (
        <div className="grid gap-3 p-3 md:grid-cols-2">
          {plan.checklists.map((c) => {
            const done = c.items.filter((i) => i.done).length, pct = c.items.length ? Math.round((done / c.items.length) * 100) : 0;
            return (
              <article key={c.id} className="rounded-xl border border-ds-border-subtle p-3">
                <div className="flex items-center gap-2"><h6 className="min-w-0 flex-1 truncate font-bold text-ds-primary-deep">{c.title}</h6><span className="text-xs font-bold text-ds-text-secondary">{done}/{c.items.length}</span>
                  <button type="button" onClick={() => { const t = window.prompt("Novo nome do checklist:", c.title); if (t?.trim() && t.trim() !== c.title) void run(() => call(`${base}/${c.id}`, { method: "PUT", body: JSON.stringify({ title: t }) })); }} aria-label={`Renomear ${c.title}`} title="Renomear" className="text-ds-primary"><Icon name="edit" className="text-[18px]" /></button>
                  <button type="button" onClick={() => { if (window.confirm(`Excluir o checklist "${c.title}"?`)) void run(() => call(`${base}/${c.id}`, { method: "DELETE" })); }} aria-label={`Excluir ${c.title}`} title="Excluir" className="text-ds-danger-text"><Icon name="delete" className="text-[18px]" /></button></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ds-bg"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "#12A262" : "#F7941D" }} /></div>
                <ul className="mt-2 space-y-1">
                  {c.items.map((i) => (
                    <li key={i.id} className="group flex items-start gap-2 text-sm">
                      <input type="checkbox" checked={i.done} onChange={(e) => void run(() => call(`${base}/${c.id}/items/${i.id}`, { method: "PUT", body: JSON.stringify({ done: e.target.checked }) }))} aria-label={i.text} className="mt-1 h-4 w-4 accent-[#12A262]" />
                      <span className={`min-w-0 flex-1 break-words ${i.done ? "text-ds-text-secondary line-through" : "text-ds-text"}`}>{i.text}{i.done && i.doneBy && <span className="ml-1 text-[10px] text-ds-text-secondary no-underline">· {i.doneBy}</span>}</span>
                      <button type="button" onClick={() => void run(() => call(`${base}/${c.id}/items/${i.id}`, { method: "DELETE" }))} aria-label="Remover item" className="text-ds-text-secondary opacity-0 hover:text-ds-danger-text group-hover:opacity-100 focus:opacity-100"><Icon name="close" className="text-[16px]" /></button>
                    </li>
                  ))}
                </ul>
                <form className="mt-2 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); const t = (drafts[c.id] ?? "").trim(); if (!t) return; setDrafts((d) => ({ ...d, [c.id]: "" })); void run(() => call(`${base}/${c.id}/items`, { method: "POST", body: JSON.stringify({ text: t }) })); }}>
                  <input value={drafts[c.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))} placeholder="Novo item..." maxLength={300} className="h-9 min-w-0 flex-1 rounded-lg border border-ds-border px-2.5 text-sm outline-none focus:border-ds-primary" />
                  <button type="submit" className="h-9 rounded-lg border border-ds-border px-3 text-sm font-bold text-ds-primary hover:border-ds-primary">Adicionar</button>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function OsWorkPlans({ osId, canManage }: { osId: string; canManage: boolean }) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [tool, setTool] = useState<"pin" | "draw">("pin");
  const [kind, setKind] = useState<Kind>("point");
  const [custom, setCustom] = useState(false);
  const [label, setLabel] = useState("");
  const [menu, setMenu] = useState(false);
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !draft) setFull(false); };
    window.addEventListener("keydown", k); const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [full, draft]);
  const [color, setColor] = useState(COLORS[0]);
  const [live, setLive] = useState<number[][] | null>(null);
  const drawing = useRef<number[][] | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const load = useCallback(() => call<Plan[]>(`/service-orders/${osId}/plans`).then((p) => { setPlans(p); setSel((s) => s ?? p[0]?.id ?? null); }).catch((e) => setError(e instanceof Error ? e.message : "Falha ao carregar.")), [osId]);
  useEffect(() => { void load(); }, [load]);

  const plan = plans?.find((p) => p.id === sel) ?? null;
  const rename = (p: Plan) => {
    const t = window.prompt(`Nome da planta no histórico (ex.: Infraestrutura, Instalação).\n${NAME_HINTS}`, p.title);
    if (t?.trim() && t.trim() !== p.title) void call(`/service-orders/${osId}/plans/${p.id}`, { method: "PUT", body: JSON.stringify({ title: t }) }).then(() => load()).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível renomear."));
  };

  async function upload(f: File | undefined) {
    if (!f) return;
    setError(""); setBusy(true);
    try {
      const fileBase64 = await shrink(f);
      const created = await call<Plan>(`/service-orders/${osId}/plans`, { method: "POST", body: JSON.stringify({ title: f.name.replace(/\.[^.]+$/, ""), fileName: f.name, mimeType: "image/jpeg", fileBase64 }) });
      setPlans((p) => [created, ...(p ?? [])]); setSel(created.id); setDraft(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar a planta."); }
    finally { setBusy(false); if (file.current) file.current.value = ""; }
  }

  async function savePoint() {
    if (!plan || !draft) return;
    setError(""); setBusy(true);
    try {
      const p = await call<Point>(`/service-orders/${osId}/plans/${plan.id}/points`, { method: "POST", body: JSON.stringify({ ...draft, kind, label: custom && kind === "point" ? label.trim() : undefined, description: text }) });
      setPlans((all) => all?.map((x) => (x.id === plan.id ? { ...x, points: [...x.points, p] } : x)) ?? all);
      setDraft(null); setText(""); setLabel(""); setCustom(false); setMenu(false); setActive(p.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o ponto."); }
    finally { setBusy(false); }
  }

  async function toggle(p: Point) {
    if (!plan) return;
    try { await call(`/service-orders/${osId}/plans/${plan.id}/points/${p.id}`, { method: "PUT", body: JSON.stringify({ done: !p.done }) }); void load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar."); }
  }
  async function remove(p: Point) {
    if (!plan || !confirm(`Excluir o ponto ${p.number}?`)) return;
    try { await call(`/service-orders/${osId}/plans/${plan.id}/points/${p.id}`, { method: "DELETE" }); void load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível excluir."); }
  }

  const pos = (e: React.PointerEvent | React.MouseEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };
  function place(e: React.MouseEvent<HTMLDivElement>) {
    if (tool !== "pin" || (e.target as HTMLElement).closest("[data-pin]")) return;
    const [x, y] = pos(e, e.currentTarget);
    setDraft({ x, y });
    setText(""); setActive(null);
  }
  function down(e: React.PointerEvent<HTMLDivElement>) {
    if (tool !== "draw") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = [pos(e, e.currentTarget)]; setLive(drawing.current); setDraft(null);
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (!drawing.current) return;
    const p = pos(e, e.currentTarget), last = drawing.current[drawing.current.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.002) return;
    drawing.current = [...drawing.current, p]; setLive(drawing.current);
  }
  async function up() {
    const pts = drawing.current; drawing.current = null; setLive(null);
    if (!pts || pts.length < 2 || !plan) return;
    try {
      const st = await call<Stroke>(`/service-orders/${osId}/plans/${plan.id}/strokes`, { method: "POST", body: JSON.stringify({ color, points: pts.slice(0, 800) }) });
      setPlans((all) => all?.map((x) => (x.id === plan.id ? { ...x, strokes: [...x.strokes, st] } : x)) ?? all);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o rabisco."); }
  }
  async function undo() {
    const last = plan?.strokes[plan.strokes.length - 1];
    if (!plan || !last) return;
    try {
      await call(`/service-orders/${osId}/plans/${plan.id}/strokes/${last.id}`, { method: "DELETE" });
      setPlans((all) => all?.map((x) => (x.id === plan.id ? { ...x, strokes: x.strokes.filter((q) => q.id !== last.id) } : x)) ?? all);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível desfazer."); }
  }

  const root = (
    <div className={full ? "fixed inset-0 z-[400] overflow-y-auto bg-[#F4F7FA] p-4 sm:p-6" : "mx-auto max-w-6xl"}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h4 className="flex items-center gap-2 text-lg font-bold text-ds-primary-deep"><Icon name="engineering" className="text-[22px]" />Gestão de Obras</h4>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void upload(e.target.files?.[0])} />
        <button type="button" disabled={busy} onClick={() => file.current?.click()} className="ml-auto inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#F7941D] px-4 text-sm font-bold text-white hover:bg-[#E5850F] disabled:opacity-60"><Icon name="upload" className="text-[20px]" />{busy ? "Enviando..." : plan ? "Anexar nova planta" : "Anexar planta"}</button>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}

      {!plans ? <p className="py-10 text-center text-sm text-ds-text-secondary">Carregando...</p> : !plan ? (
        <div className="rounded-2xl border border-dashed border-ds-border bg-white px-6 py-14 text-center">
          <Icon name="map" className="text-[44px] text-ds-text-secondary" />
          <p className="mt-2 font-bold text-ds-primary-deep">Nenhuma planta anexada</p>
          <p className="text-sm text-ds-text-secondary">Anexe a imagem da planta da obra para marcar pontos e descrever o que precisa ser feito em cada um.</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${full ? "lg:grid-cols-[1fr_380px]" : "lg:grid-cols-[1fr_320px]"}`}>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setTool("pin")} aria-pressed={tool === "pin"} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold ${tool === "pin" ? "bg-ds-primary text-white" : "border border-ds-border bg-white text-ds-primary-deep"}`}><Icon name="location_on" className="text-[18px]" />Marcar</button>
              <button type="button" onClick={() => { setTool("draw"); setDraft(null); }} aria-pressed={tool === "draw"} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold ${tool === "draw" ? "bg-ds-primary text-white" : "border border-ds-border bg-white text-ds-primary-deep"}`}><Icon name="draw" className="text-[18px]" />Desenhar</button>
              {tool === "draw" && COLORS.map((c) => <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Cor ${c}`} style={{ background: c }} className={`h-7 w-7 rounded-full border-2 shadow ${color === c ? "border-ds-primary-deep ring-2 ring-ds-primary/40" : "border-white"}`} />)}
              <button type="button" disabled={!plan.strokes.length} onClick={() => void undo()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ds-border bg-white px-3 text-sm font-semibold text-ds-primary-deep disabled:opacity-40"><Icon name="undo" className="text-[18px]" />Desfazer rabisco</button>
              <button type="button" onClick={() => setFull((v) => !v)} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-ds-border bg-white px-3 text-sm font-semibold text-ds-primary-deep hover:border-ds-primary"><Icon name={full ? "fullscreen_exit" : "fullscreen"} className="text-[18px]" />{full ? "Sair da tela cheia" : "Maximizar"}</button>
            </div>
            <p className="mb-2 flex items-center gap-2 text-xs text-ds-text-secondary"><Icon name="touch_app" className="text-[16px]" />{tool === "pin" ? "Clique na planta para marcar e descrever." : "Arraste sobre a planta para desenhar."} <b className="text-ds-primary-deep">{plan.title}</b><button type="button" onClick={() => rename(plan)} aria-label="Dar nome à planta" title="Dar nome à planta" className="inline-flex text-ds-primary hover:text-ds-primary-deep"><Icon name="edit" className="text-[16px]" /></button> · enviada por {plan.userName} em {fmtDateTime(plan.createdAt)}</p>
            {(() => { const board = (
            <div className={`relative inline-block max-w-full cursor-crosshair select-none rounded-xl ${draft ? "overflow-visible" : "overflow-hidden"} ${tool === "draw" ? "touch-none" : ""}`} onClick={place} onPointerDown={down} onPointerMove={move} onPointerUp={() => void up()} onPointerCancel={() => void up()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={plan.fileUrl} alt={plan.title} draggable={false} className={`block h-auto w-auto max-w-full rounded-xl ${full ? "max-h-[calc(100dvh-250px)]" : "max-h-[min(72vh,820px)]"}`} />
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
                {[...plan.strokes, ...(live ? [{ id: "live", color, points: live, userName: "" }] : [])].map((st) => <polyline key={st.id} points={st.points.map((q) => q.join(",")).join(" ")} fill="none" stroke={st.color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
              </svg>
              {plan.points.map((p) => {
                const k = kindOf(p.kind), flip = p.x > 0.62, short = p.description.length > 48 ? `${p.description.slice(0, 46)}…` : p.description;
                return (
                  <button key={p.id} type="button" data-pin onClick={() => { setActive(p.id); setDraft(null); }} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} aria-label={`${k.label} ${p.number}`} className={`absolute -translate-x-1/2 -translate-y-1/2 ${active === p.id ? "z-20" : "z-10"}`}>
                    {p.kind === "x" && !p.done ? <span className="flex h-7 w-7 items-center justify-center"><ObjectionMark active={active === p.id} /></span> : <span style={{ background: p.done ? "#12A262" : k.bg }} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-extrabold text-white shadow-lg ${active === p.id ? "scale-125 ring-4 ring-ds-primary/40" : ""}`}>{p.kind === "point" ? p.number : <Icon name={p.done ? "check" : k.icon} className="text-[16px]" />}</span>}
                    <span style={{ borderColor: k.bg }} className={`absolute top-1/2 -translate-y-1/2 rounded-md border bg-white/95 px-1.5 py-0.5 text-left text-[11px] font-semibold leading-tight text-ds-text shadow ${flip ? "right-full mr-2" : "left-full ml-2"} ${active === p.id ? "w-max max-w-[260px] whitespace-normal" : "max-w-[170px] truncate whitespace-nowrap"}`}>{p.label && <b className="mr-1">{p.label}:</b>}{active === p.id ? p.description : short}</span>
                  </button>
                );
              })}
              {draft && (
                <div data-pin onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} style={{ top: `${Math.min(Math.max(draft.y, 0.2), 0.8) * 100}%`, ...(draft.x > 0.5 ? { right: `${(1 - draft.x) * 100}%`, marginRight: 22 } : { left: `${draft.x * 100}%`, marginLeft: 22 }) }} className="absolute z-30 w-[min(250px,72%)] -translate-y-1/2 cursor-default rounded-xl border border-ds-primary/40 bg-white p-2.5 text-left shadow-xl">
                  <div className="relative">
                    <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="listbox" aria-expanded={menu} className="flex h-9 w-full items-center gap-2 rounded-lg border border-ds-border bg-white px-2.5 text-sm font-bold text-ds-primary-deep">
                      {kind === "x" ? <ObjectionMark size={18} /> : <span style={{ color: kindOf(kind).bg }} className="flex"><Icon name={kindOf(kind).icon} className="text-[18px]" /></span>}
                      <span className="flex-1 truncate text-left">{custom ? label.trim() || "Outro nome" : kindOf(kind).label}</span><Icon name="expand_more" className="text-[18px]" />
                    </button>
                    {menu && (
                      <ul role="listbox" className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-ds-border bg-white shadow-lg">
                        {KINDS.map((k) => <li key={k.key}><button type="button" role="option" aria-selected={!custom && kind === k.key} onClick={() => { setKind(k.key); setCustom(false); setMenu(false); }} className="flex w-full items-center gap-2 px-2.5 py-2 text-sm font-semibold text-ds-text hover:bg-ds-bg">{k.key === "x" ? <ObjectionMark size={18} /> : <span style={{ color: k.bg }} className="flex"><Icon name={k.icon} className="text-[18px]" /></span>}{k.label}</button></li>)}
                        <li><button type="button" role="option" aria-selected={custom} onClick={() => { setKind("point"); setCustom(true); setMenu(false); }} className="flex w-full items-center gap-2 border-t border-ds-border-subtle px-2.5 py-2 text-sm font-semibold text-ds-text hover:bg-ds-bg"><Icon name="edit" className="text-[18px] text-[#F7941D]" />Outro nome…</button></li>
                      </ul>
                    )}
                  </div>
                  {custom && <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="Nome da marcação (ex.: Câmera)" className="mt-2 h-9 w-full rounded-lg border border-ds-border px-2.5 text-sm outline-none focus:border-ds-primary" />}
                  <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} placeholder="O que deve ser feito neste ponto?" className="mt-2 w-full resize-none rounded-lg border border-ds-border px-2.5 py-2 text-sm outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" />
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy || !text.trim() || (custom && !label.trim())} onClick={() => void savePoint()} className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[#F7941D] px-3 text-sm font-bold text-white hover:bg-[#E5850F] disabled:opacity-60">{busy ? "Salvando..." : "Salvar"}</button>
                    <button type="button" onClick={() => { setDraft(null); setMenu(false); }} className="inline-flex h-9 items-center rounded-lg border border-ds-border px-3 text-sm font-semibold text-ds-primary-deep">Cancelar</button>
                  </div>
                </div>
              )}
              {draft && (kind === "x" ? <span style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 animate-pulse"><ObjectionMark /></span> : <span style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, background: kindOf(kind).bg }} className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-white shadow-lg" />)}
            </div>
            ); return <div className="flex justify-center rounded-xl border border-ds-border bg-ds-bg p-1.5">{board}</div>; })()}
            <PlanChecklists osId={osId} plan={plan} onChange={() => void load()} />
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-ds-border-subtle bg-white">
              <h5 className="border-b border-ds-border-subtle px-3 py-2.5 text-sm font-bold text-ds-primary-deep">Pontos ({plan.points.length})</h5>
              <ul className="max-h-80 divide-y divide-ds-border-subtle overflow-y-auto">
                {plan.points.length === 0 && <li className="px-3 py-5 text-center text-sm text-ds-text-secondary">Nenhum ponto marcado.</li>}
                {plan.points.map((p) => (
                  <li key={p.id} onClick={() => setActive(p.id)} className={`flex gap-2.5 px-3 py-2.5 ${active === p.id ? "bg-ds-primary/5" : ""}`}>
                    {p.kind === "x" && !p.done ? <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center"><ObjectionMark size={22} /></span> : <span style={{ background: p.done ? "#12A262" : kindOf(p.kind).bg }} className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white">{p.kind === "point" ? p.number : <Icon name={p.done ? "check" : kindOf(p.kind).icon} className="text-[14px]" />}</span>}
                    <div className="min-w-0 flex-1">
                      <p className={`whitespace-pre-wrap break-words text-sm ${p.done ? "text-ds-text-secondary line-through" : "text-ds-text"}`}>{p.description}</p>
                      <p className="mt-0.5 text-[11px] text-ds-text-secondary">{p.userName} · {fmtDateTime(p.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button type="button" onClick={(e) => { e.stopPropagation(); void toggle(p); }} aria-label={p.done ? "Reabrir ponto" : "Concluir ponto"} title={p.done ? "Reabrir" : "Concluir"} className="text-ds-primary hover:text-ds-primary-deep"><Icon name={p.done ? "undo" : "check_circle"} className="text-[18px]" /></button>
                      {canManage && <button type="button" onClick={(e) => { e.stopPropagation(); void remove(p); }} aria-label="Excluir ponto" title="Excluir" className="text-ds-danger-text"><Icon name="delete" className="text-[18px]" /></button>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-ds-border-subtle bg-white">
              <h5 className="border-b border-ds-border-subtle px-3 py-2.5 text-sm font-bold text-ds-primary-deep">Histórico de plantas ({plans.length})</h5>
              <ul className="max-h-72 divide-y divide-ds-border-subtle overflow-y-auto">
                {plans.map((p) => (
                  <li key={p.id}><button type="button" onClick={() => { setSel(p.id); setDraft(null); setActive(null); }} className={`flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-ds-bg ${p.id === sel ? "bg-ds-primary/5" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.fileUrl} alt="" className="h-12 w-16 shrink-0 rounded-md border border-ds-border object-cover" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ds-primary-deep">{p.title}</span><span className="block text-[11px] text-ds-text-secondary">{p.checklists.length} {p.checklists.length === 1 ? "checklist" : "checklists"}</span><span className="block text-[11px] text-ds-text-secondary">{fmtDateTime(p.createdAt)} · {p.userName}</span><span className="block text-[11px] text-ds-text-secondary">{p.points.length} {p.points.length === 1 ? "ponto" : "pontos"}</span></span>
                  </button></li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
  return full && typeof document !== "undefined" ? createPortal(root, document.body) : root;
}
