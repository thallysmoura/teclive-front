"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ApiError, authFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/operacional";

type Kind = "point" | "ok" | "x";
type Point = { id: string; number: number; x: number; y: number; kind: Kind; description: string; done: boolean; userName: string; createdAt: string };
type Stroke = { id: string; color: string; points: number[][]; userName: string };
type Plan = { id: string; title: string; fileUrl: string; userName: string; createdAt: string; points: Point[]; strokes: Stroke[] };
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
  const [color, setColor] = useState(COLORS[0]);
  const [live, setLive] = useState<number[][] | null>(null);
  const drawing = useRef<number[][] | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const load = useCallback(() => call<Plan[]>(`/service-orders/${osId}/plans`).then((p) => { setPlans(p); setSel((s) => s ?? p[0]?.id ?? null); }).catch((e) => setError(e instanceof Error ? e.message : "Falha ao carregar.")), [osId]);
  useEffect(() => { void load(); }, [load]);

  const plan = plans?.find((p) => p.id === sel) ?? null;

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
      const p = await call<Point>(`/service-orders/${osId}/plans/${plan.id}/points`, { method: "POST", body: JSON.stringify({ ...draft, kind, description: text }) });
      setPlans((all) => all?.map((x) => (x.id === plan.id ? { ...x, points: [...x.points, p] } : x)) ?? all);
      setDraft(null); setText(""); setActive(p.id);
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

  return (
    <div className="mx-auto max-w-6xl">
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
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setTool("pin")} aria-pressed={tool === "pin"} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold ${tool === "pin" ? "bg-ds-primary text-white" : "border border-ds-border bg-white text-ds-primary-deep"}`}><Icon name="location_on" className="text-[18px]" />Marcar</button>
              <button type="button" onClick={() => { setTool("draw"); setDraft(null); }} aria-pressed={tool === "draw"} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold ${tool === "draw" ? "bg-ds-primary text-white" : "border border-ds-border bg-white text-ds-primary-deep"}`}><Icon name="draw" className="text-[18px]" />Desenhar</button>
              {tool === "draw" && COLORS.map((c) => <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Cor ${c}`} style={{ background: c }} className={`h-7 w-7 rounded-full border-2 shadow ${color === c ? "border-ds-primary-deep ring-2 ring-ds-primary/40" : "border-white"}`} />)}
              <button type="button" disabled={!plan.strokes.length} onClick={() => void undo()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ds-border bg-white px-3 text-sm font-semibold text-ds-primary-deep disabled:opacity-40"><Icon name="undo" className="text-[18px]" />Desfazer rabisco</button>
            </div>
            <p className="mb-2 flex items-center gap-2 text-xs text-ds-text-secondary"><Icon name="touch_app" className="text-[16px]" />{tool === "pin" ? "Clique na planta para marcar e descrever." : "Arraste sobre a planta para desenhar."} <b className="text-ds-primary-deep">{plan.title}</b> · enviada por {plan.userName} em {fmtDateTime(plan.createdAt)}</p>
            <div className={`relative cursor-crosshair select-none overflow-hidden rounded-xl border border-ds-border bg-ds-bg ${tool === "draw" ? "touch-none" : ""}`} onClick={place} onPointerDown={down} onPointerMove={move} onPointerUp={() => void up()} onPointerCancel={() => void up()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={plan.fileUrl} alt={plan.title} draggable={false} className="block h-auto w-full" />
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
                {[...plan.strokes, ...(live ? [{ id: "live", color, points: live, userName: "" }] : [])].map((st) => <polyline key={st.id} points={st.points.map((q) => q.join(",")).join(" ")} fill="none" stroke={st.color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
              </svg>
              {plan.points.map((p) => {
                const k = kindOf(p.kind), flip = p.x > 0.62, short = p.description.length > 48 ? `${p.description.slice(0, 46)}…` : p.description;
                return (
                  <button key={p.id} type="button" data-pin onClick={() => { setActive(p.id); setDraft(null); }} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} aria-label={`${k.label} ${p.number}`} className={`absolute -translate-x-1/2 -translate-y-1/2 ${active === p.id ? "z-20" : "z-10"}`}>
                    {p.kind === "x" && !p.done ? <span className="flex h-7 w-7 items-center justify-center"><ObjectionMark active={active === p.id} /></span> : <span style={{ background: p.done ? "#12A262" : k.bg }} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-extrabold text-white shadow-lg ${active === p.id ? "scale-125 ring-4 ring-ds-primary/40" : ""}`}>{p.kind === "point" ? p.number : <Icon name={p.done ? "check" : k.icon} className="text-[16px]" />}</span>}
                    <span style={{ borderColor: k.bg }} className={`absolute top-1/2 -translate-y-1/2 rounded-md border bg-white/95 px-1.5 py-0.5 text-left text-[11px] font-semibold leading-tight text-ds-text shadow ${flip ? "right-full mr-2" : "left-full ml-2"} ${active === p.id ? "w-max max-w-[260px] whitespace-normal" : "max-w-[170px] truncate whitespace-nowrap"}`}>{active === p.id ? p.description : short}</span>
                  </button>
                );
              })}
              {draft && (kind === "x" ? <span style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 animate-pulse"><ObjectionMark /></span> : <span style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, background: kindOf(kind).bg }} className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-white shadow-lg" />)}
            </div>
            {draft && (
              <div className="mt-3 rounded-xl border border-ds-primary/40 bg-white p-3 shadow-sm">
                <div className="mb-2 flex flex-wrap gap-2">{KINDS.map((k) => <button key={k.key} type="button" onClick={() => setKind(k.key)} aria-pressed={kind === k.key} style={kind === k.key ? { background: k.bg, borderColor: k.bg } : undefined} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-bold ${kind === k.key ? "text-white" : "border-ds-border bg-white text-ds-primary-deep"}`}>{k.key === "x" ? <ObjectionMark size={18} /> : <Icon name={k.icon} className="text-[18px]" />}{k.label}</button>)}</div>
                <label className="mb-1 block text-xs font-bold text-ds-text-secondary">Descrição *</label>
                <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} placeholder="O que deve ser feito neste ponto?" className="w-full resize-y rounded-[10px] border border-ds-border px-3 py-2 text-sm outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" />
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={busy || !text.trim()} onClick={() => void savePoint()} className="inline-flex h-10 items-center rounded-[10px] bg-[#F7941D] px-5 text-sm font-bold text-white hover:bg-[#E5850F] disabled:opacity-60">{busy ? "Salvando..." : "Salvar ponto"}</button>
                  <button type="button" onClick={() => setDraft(null)} className="inline-flex h-10 items-center rounded-[10px] border border-ds-border px-4 text-sm font-semibold text-ds-primary-deep">Cancelar</button>
                </div>
                <p className="mt-2 text-xs text-ds-text-secondary">Os administradores serão avisados na hora.</p>
              </div>
            )}
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
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ds-primary-deep">{p.title}</span><span className="block text-[11px] text-ds-text-secondary">{fmtDateTime(p.createdAt)} · {p.userName}</span><span className="block text-[11px] text-ds-text-secondary">{p.points.length} {p.points.length === 1 ? "ponto" : "pontos"}</span></span>
                  </button></li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
