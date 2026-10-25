"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { toCanvas } from "html-to-image";
import { Icon } from "@/components/ui/icon";
import { createSuggestion, SUGGESTION_CATEGORIES, uploadSuggestionImage } from "@/lib/suggestions";

type Tool = "pin" | "draw";
type Mark = { kind: "pin"; x: number; y: number; note: string } | { kind: "stroke"; points: [number, number][] };

const MAX_WIDTH = 1400;
const RED = "#E5322D";

/** Captura a parte visível da tela (sem abrir diálogo do navegador) antes de abrir a janela. */
async function capture(): Promise<HTMLCanvasElement | null> {
  try {
    const canvas = await toCanvas(document.body, {
      width: window.innerWidth, height: window.innerHeight, pixelRatio: 1,
      style: { transform: `translate(${-window.scrollX}px, ${-window.scrollY}px)`, transformOrigin: "top left" },
      imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      filter: (node) => !(node instanceof HTMLElement && (node.dataset.noCapture !== undefined || node.tagName === "NEXTJS-PORTAL")),
    });
    if (canvas.width <= MAX_WIDTH) return canvas;
    const small = document.createElement("canvas");
    small.width = MAX_WIDTH; small.height = Math.round((canvas.height * MAX_WIDTH) / canvas.width);
    small.getContext("2d")!.drawImage(canvas, 0, 0, small.width, small.height);
    return small;
  } catch { return null; }
}

function label(ctx: CanvasRenderingContext2D, m: { x: number; y: number; note: string }, unit: number, width: number) {
  const size = 13 * unit, pad = 7 * unit, maxW = 230 * unit;
  ctx.font = `600 ${size}px sans-serif`;
  const lines: string[] = [];
  let line = "";
  for (const word of m.note.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, 4);
  if (lines.length > 4) shown[3] = `${shown[3].slice(0, -1)}…`;
  const w = Math.max(...shown.map((l) => ctx.measureText(l).width)) + pad * 2, h = shown.length * size * 1.25 + pad * 2 - size * 0.25;
  const gap = 22 * unit;
  const x = m.x + gap + w > width ? Math.max(4 * unit, m.x - gap - w) : m.x + gap;
  const y = Math.max(4 * unit, m.y - h / 2);
  ctx.fillStyle = "#fff"; ctx.strokeStyle = RED; ctx.lineWidth = 2 * unit;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 7 * unit); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#1B2B3A"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  shown.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + i * size * 1.25));
}

function paint(canvas: HTMLCanvasElement, base: HTMLCanvasElement | null, marks: Mark[]) {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (base) ctx.drawImage(base, 0, 0); else { ctx.fillStyle = "#EEF3F8"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  const unit = Math.max(1, canvas.width / 900);
  let n = 0;
  for (const m of marks) {
    if (m.kind === "stroke") {
      ctx.strokeStyle = RED; ctx.lineWidth = 4 * unit; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      m.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (m.points.length === 1) ctx.lineTo(m.points[0][0] + 0.1, m.points[0][1]);
      ctx.stroke();
    } else {
      n += 1;
      const r = 15 * unit;
      ctx.fillStyle = RED; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3 * unit;
      ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = `bold ${15 * unit}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(n), m.x, m.y + unit);
      if (m.note) label(ctx, m, unit, canvas.width);
    }
  }
}

async function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  for (const [type, q] of [["image/webp", 0.85], ["image/webp", 0.65], ["image/jpeg", 0.6]] as const) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));
    if (blob && blob.type === type && blob.size <= 1100 * 1024) return blob;
  }
  throw new Error("A captura ficou grande demais.");
}

type Shot = { base: HTMLCanvasElement | null; title: string; path: string; viewport: string };

/** Botão "Sugerir melhoria": captura a tela, abre a janela com a imagem para marcar/desenhar e envia a sugestão. */
export function SuggestionButton() {
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);

  async function start() {
    if (busy) return;
    setBusy(true);
    const base = await capture();
    const h1 = document.querySelector("main h1")?.cloneNode(true) as HTMLElement | undefined;
    h1?.querySelectorAll(".material-symbols-outlined").forEach((n) => n.remove());
    const title = h1?.textContent?.trim() || document.title || location.pathname;
    setShot({ base, title, path: location.pathname + location.search, viewport: `${window.innerWidth}x${window.innerHeight}` });
    setBusy(false);
  }

  return (
    <>
      <button type="button" data-no-capture onClick={() => void start()} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ds-border bg-white px-3 text-xs font-semibold text-ds-text-muted shadow-sm transition-colors hover:border-ds-primary hover:text-ds-primary disabled:opacity-60">
        <Icon name="lightbulb" className="text-[16px]" />{busy ? "Capturando..." : "Sugerir melhoria"}
      </button>
      {shot && <SuggestionDialog {...shot} onClose={() => setShot(null)} />}
    </>
  );
}

function SuggestionDialog({ base, title, path, viewport, onClose }: Shot & { onClose: () => void }) {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<[number, number][] | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [tool, setTool] = useState<Tool>("pin");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const size = { w: base?.width ?? 1200, h: base?.height ?? 700 };

  useEffect(() => { if (canvasRef.current) paint(canvasRef.current, base, marks); }, [base, marks]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !sending) onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose, sending]);

  const point = (e: React.PointerEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [((e.clientX - rect.left) * size.w) / rect.width, ((e.clientY - rect.top) * size.h) / rect.height];
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault(); // evita que o clique no canvas tire o foco do campo da observação
    const p = point(e);
    if (tool === "pin") {
      const unit = Math.max(1, size.w / 900);
      const hit = marks.findIndex((m) => m.kind === "pin" && Math.hypot(m.x - p[0], m.y - p[1]) < 20 * unit);
      if (hit >= 0) { setEditing(hit); return; } // clicar num ponto existente edita a observação
      setMarks((m) => [...m, { kind: "pin", x: p[0], y: p[1], note: "" }]);
      setEditing(marks.length);
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    drawing.current = [p];
    setMarks((m) => [...m, { kind: "stroke", points: [p] }]);
  };
  const move = (e: React.PointerEvent) => {
    if (tool !== "draw" || !drawing.current) return;
    drawing.current.push(point(e));
    const points = [...drawing.current];
    setMarks((m) => { const copy = m.slice(); copy[copy.length - 1] = { kind: "stroke", points }; return copy; });
  };

  async function send() {
    setError(null);
    if (!category) return setError("Escolha o tipo de melhoria.");
    if (name.trim().length < 3) return setError("Informe qual é a melhoria.");
    if (details.trim().length < 10) return setError("Descreva a melhoria com um pouco mais de detalhe.");
    setSending(true);
    try {
      const imageUrl = base ? await uploadSuggestionImage(await toBlob(canvasRef.current!)) : undefined;
      const notes = marks.filter((m): m is Extract<Mark, { kind: "pin" }> => m.kind === "pin").map((m, i) => (m.note ? `${i + 1}) ${m.note}` : "")).filter(Boolean);
      await createSuggestion({ category, title: name.trim(), description: details.trim() + (notes.length ? `\n\nObservações nos pontos da imagem:\n${notes.join("\n")}` : ""), screenPath: path || pathname, screenTitle: title, imageUrl, viewport });
      setDone(true);
      setTimeout(onClose, 1800);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar."); setSending(false); }
  }

  const field = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";
  const toolBtn = (active: boolean) => `inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${active ? "bg-ds-primary text-white" : "border border-ds-border bg-white text-ds-text-muted hover:border-ds-primary"}`;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-[#10202e]/60 sm:items-center sm:p-4" data-no-capture>
      <div className="absolute inset-0" onClick={() => !sending && onClose()} />
      <div role="dialog" aria-modal="true" aria-label="Sugerir melhoria" className="relative flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {done ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#12A262]/10 text-[#12A262]"><Icon name="check_circle" className="text-[34px]" /></span>
            <h2 className="text-lg font-extrabold text-ds-primary-deep">Sugestão enviada!</h2>
            <p className="text-sm text-ds-text-secondary">Obrigado por ajudar a melhorar o sistema.</p>
          </div>
        ) : (
          <>
            <header className="flex items-start gap-3 border-b border-ds-border-subtle px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ds-primary/10 text-ds-primary"><Icon name="lightbulb" className="text-[22px]" /></span>
              <div className="min-w-0 flex-1"><h2 className="text-lg font-extrabold leading-tight text-ds-primary-deep">Sugerir melhoria</h2><p className="truncate text-xs text-ds-text-secondary">Tela: {title}</p></div>
              <button type="button" onClick={onClose} disabled={sending} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-lg text-ds-text-secondary hover:bg-ds-bg"><Icon name="close" className="text-[20px]" /></button>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <p className="mb-2 flex items-start gap-2 rounded-xl bg-ds-primary/5 px-3 py-2 text-xs leading-snug text-ds-text-muted"><Icon name="ads_click" className="mt-px shrink-0 text-[16px] text-ds-primary" />{base ? "Clique na imagem onde a melhoria deve entrar e escreva o que fazer ali (um ponto por vez). Também dá para desenhar para destacar uma área." : "Não foi possível capturar a tela, mas você ainda pode enviar a sugestão descrevendo abaixo."}</p>
                {base && (
                  <>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setTool("pin")} className={toolBtn(tool === "pin")}><Icon name="location_on" className="text-[16px]" />Marcar ponto</button>
                      <button type="button" onClick={() => setTool("draw")} className={toolBtn(tool === "draw")}><Icon name="draw" className="text-[16px]" />Desenhar</button>
                      <button type="button" onClick={() => { setEditing(null); setMarks((m) => m.slice(0, -1)); }} disabled={!marks.length} className={`${toolBtn(false)} disabled:opacity-40`}><Icon name="undo" className="text-[16px]" />Desfazer</button>
                      <button type="button" onClick={() => { setEditing(null); setMarks([]); }} disabled={!marks.length} className={`${toolBtn(false)} disabled:opacity-40`}><Icon name="delete" className="text-[16px]" />Limpar</button>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg">
                      <div className="relative"><canvas ref={canvasRef} width={size.w} height={size.h} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drawing.current = null; }} onPointerCancel={() => { drawing.current = null; }} className="block h-auto w-full cursor-crosshair touch-none select-none" />
                      {editing !== null && marks[editing]?.kind === "pin" && (() => {
                        const m = marks[editing] as Extract<Mark, { kind: "pin" }>;
                        const left = (m.x / size.w) * 100, top = (m.y / size.h) * 100;
                        return (
                          <input autoFocus value={m.note} maxLength={120} placeholder="O que fazer aqui? (Enter para salvar)"
                            onChange={(e) => setMarks((all) => all.map((x, i) => (i === editing && x.kind === "pin" ? { ...x, note: e.target.value } : x)))}
                            onBlur={() => setEditing(null)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setEditing(null); } else if (e.key === "Escape") { e.stopPropagation(); setEditing(null); } }}
                            style={{ top: `${top}%`, ...(left > 55 ? { right: `${100 - left + 3}%` } : { left: `${left + 3}%` }) }}
                            className="absolute z-10 h-9 w-[min(260px,60%)] -translate-y-1/2 rounded-lg border-2 border-[#E5322D] bg-white px-2.5 text-xs font-medium text-ds-text shadow-lg outline-none" />
                        );
                      })()}
                    </div>
                    </div>
                  </>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                <label className="block"><span className="mb-1 block text-xs font-bold text-ds-text-secondary">Tipo</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={sending} className={field}><option value="">Selecione...</option>{SUGGESTION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
                <label className="block"><span className="mb-1 block text-xs font-bold text-ds-text-secondary">Qual melhoria?</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={160} disabled={sending} placeholder="Ex.: Filtro por período na lista" className={field} /></label>
              </div>
              <label className="block"><span className="mb-1 block text-xs font-bold text-ds-text-secondary">Detalhes</span>
                <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={4000} rows={4} disabled={sending} placeholder="Explique o que você gostaria que mudasse e por quê." className={`${field} h-auto resize-y py-2.5`} /></label>
              {error && <p role="alert" className="text-sm font-medium text-ds-danger-text">{error}</p>}
            </div>
            <footer className="flex gap-2 border-t border-ds-border-subtle px-5 py-3">
              <button type="button" onClick={onClose} disabled={sending} className="h-11 flex-1 rounded-[10px] border border-ds-border text-sm font-semibold text-ds-text-muted hover:border-ds-primary sm:flex-none sm:px-6">Cancelar</button>
              <button type="button" onClick={() => void send()} disabled={sending} className="btn-add inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] text-sm font-bold text-white disabled:opacity-60 sm:flex-none sm:px-8">{sending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Enviando...</> : <><Icon name="send" className="text-[18px]" />Enviar sugestão</>}</button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
