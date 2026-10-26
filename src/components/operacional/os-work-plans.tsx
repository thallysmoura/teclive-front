"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ApiError, authFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/operacional";

type Point = { id: string; number: number; x: number; y: number; description: string; done: boolean; userName: string; createdAt: string };
type Plan = { id: string; title: string; fileUrl: string; userName: string; createdAt: string; points: Point[] };

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
      const p = await call<Point>(`/service-orders/${osId}/plans/${plan.id}/points`, { method: "POST", body: JSON.stringify({ ...draft, description: text }) });
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

  function place(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-pin]")) return;
    const r = e.currentTarget.getBoundingClientRect();
    setDraft({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) });
    setText(""); setActive(null);
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
            <p className="mb-2 flex items-center gap-2 text-xs text-ds-text-secondary"><Icon name="touch_app" className="text-[16px]" />Clique na planta para marcar um ponto e descrever. <b className="text-ds-primary-deep">{plan.title}</b> · enviada por {plan.userName} em {fmtDateTime(plan.createdAt)}</p>
            <div className="relative cursor-crosshair select-none overflow-hidden rounded-xl border border-ds-border bg-ds-bg" onClick={place}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={plan.fileUrl} alt={plan.title} draggable={false} className="block h-auto w-full" />
              {plan.points.map((p) => (
                <button key={p.id} type="button" data-pin onClick={() => { setActive(p.id); setDraft(null); }} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} aria-label={`Ponto ${p.number}`} className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-extrabold text-white shadow-lg ${p.done ? "bg-[#12A262]" : "bg-[#F7941D]"} ${active === p.id ? "scale-125 ring-4 ring-ds-primary/40" : ""}`}>{p.number}</button>
              ))}
              {draft && <span style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }} className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-white bg-ds-primary shadow-lg" />}
            </div>
            {draft && (
              <div className="mt-3 rounded-xl border border-ds-primary/40 bg-white p-3 shadow-sm">
                <label className="mb-1 block text-xs font-bold text-ds-text-secondary">Descrição do ponto *</label>
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
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white ${p.done ? "bg-[#12A262]" : "bg-[#F7941D]"}`}>{p.number}</span>
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
