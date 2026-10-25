"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { toCanvas } from "html-to-image";
import { Icon } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Me } from "@/lib/api";
import { createSuggestion, listMySuggestions, STATUS_INFO, uploadSuggestionImage, type MySuggestion } from "@/lib/suggestions";

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
export function SuggestionButton({ user }: { user: Me }) {
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
      {/* Portal no <body>: um ancestral com transform (animação de entrada da página) quebraria o position: fixed. */}
      {typeof document !== "undefined" && createPortal(<div data-no-capture className="fixed right-[68px] top-3 z-30 md:right-8 md:top-3 md:drop-shadow-md"><button type="button" data-no-capture onClick={() => void start()} disabled={busy} aria-label="Sugerir melhoria" title="Sugerir melhoria" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7941D] text-xs font-bold text-white transition-colors hover:bg-[#E5850F] disabled:opacity-60 md:h-9 md:w-auto md:gap-2 md:py-1 md:pl-1 md:pr-3.5">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-[22px] w-[22px] md:hidden ${busy ? "animate-pulse" : ""}`}><path d="M9 18h6M10 21.5h4" /><path d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.6.5.9 1.1.9 1.8V16h6v-.1c0-.7.3-1.3.9-1.8A6.5 6.5 0 0 0 12 2.5Z" /></svg>
        <span className="hidden md:contents"><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={28} />{busy ? "Capturando..." : "Sugerir melhoria"}</span>
      </button></div>, document.body)}
      {shot && <SuggestionDialog {...shot} onClose={() => setShot(null)} />}
    </>
  );
}

function SuggestionDialog({ base, title, path, viewport, onClose }: Shot & { onClose: () => void }) {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<[number, number][] | null>(null);
  const dragPin = useRef<{ index: number; moved: boolean } | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [tool, setTool] = useState<Tool>("pin");
  const [details, setDetails] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"form" | "list">("form");
  const [sent, setSent] = useState(false);
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
      if (hit >= 0) { (e.target as Element).setPointerCapture(e.pointerId); dragPin.current = { index: hit, moved: false }; return; } // arrastar move o ponto; clicar edita a observação
      setMarks((m) => [...m, { kind: "pin", x: p[0], y: p[1], note: "" }]);
      setEditing(marks.length);
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    drawing.current = [p];
    setMarks((m) => [...m, { kind: "stroke", points: [p] }]);
  };
  const move = (e: React.PointerEvent) => {
    if (dragPin.current) {
      const p = point(e);
      const { index } = dragPin.current;
      dragPin.current.moved = true;
      setEditing(null);
      setMarks((all) => all.map((m, i) => (i === index && m.kind === "pin" ? { ...m, x: Math.min(Math.max(p[0], 0), size.w), y: Math.min(Math.max(p[1], 0), size.h) } : m)));
      return;
    }
    if (tool !== "draw" || !drawing.current) return;
    drawing.current.push(point(e));
    const points = [...drawing.current];
    setMarks((m) => { const copy = m.slice(); copy[copy.length - 1] = { kind: "stroke", points }; return copy; });
  };

  const release = () => {
    if (dragPin.current && !dragPin.current.moved) setEditing(dragPin.current.index);
    dragPin.current = null;
    drawing.current = null;
  };

  async function send() {
    setError(null);
    if (details.trim().length < 10) return setError("Descreva a melhoria com um pouco mais de detalhe.");
    setSending(true);
    try {
      const imageUrl = base ? await uploadSuggestionImage(await toBlob(canvasRef.current!)) : undefined;
      const notes = marks.filter((m): m is Extract<Mark, { kind: "pin" }> => m.kind === "pin").map((m, i) => (m.note ? `${i + 1}) ${m.note}` : "")).filter(Boolean);
      await createSuggestion({ description: details.trim() + (notes.length ? `\n\nObservações nos pontos da imagem:\n${notes.join("\n")}` : ""), screenPath: path || pathname, screenTitle: title, imageUrl, viewport });
      setSent(true);
      window.dispatchEvent(new Event("sidebar:updated"));
      setView("list");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar."); }
    finally { setSending(false); }
  }


  const toolBtn = (active: boolean) => `inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${active ? "bg-ds-primary text-white" : "border border-ds-border bg-white text-ds-text-muted hover:border-ds-primary"}`;
  const pinCount = marks.filter((m) => m.kind === "pin").length;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-stretch justify-center bg-[#10202e]/60 sm:items-center sm:p-4" data-no-capture>
      <div className="absolute inset-0" onClick={() => !sending && onClose()} />
      <div role="dialog" aria-modal="true" aria-label="Sugerir melhoria" className="relative flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[94vh] sm:rounded-3xl">
        <header className="flex items-center gap-3 border-b border-ds-border-subtle px-4 py-3 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ds-primary/10 text-ds-primary"><Icon name="lightbulb" className="text-[22px]" /></span>
          <div className="min-w-0 flex-1"><h2 className="text-lg font-extrabold leading-tight text-ds-primary-deep">{view === "list" ? "Minhas sugestões" : "Sugerir melhoria"}</h2><p className="truncate text-xs text-ds-text-secondary">{view === "list" ? "Acompanhe a situação de cada envio" : `Tela: ${title}`}</p></div>
          {view === "list" ? (
            <button type="button" onClick={() => { setSent(false); setView("form"); }} className="inline-flex h-9 items-center rounded-lg border border-ds-border px-3 text-xs font-semibold text-ds-text-muted hover:border-ds-primary">Nova sugestão</button>
          ) : (
            <button type="button" onClick={() => setView("list")} disabled={sending} className="inline-flex h-9 items-center rounded-lg border border-ds-border px-3 text-xs font-semibold text-ds-text-muted hover:border-ds-primary">Minhas sugestões</button>
          )}
          <button type="button" onClick={onClose} disabled={sending} aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#E5322D] hover:bg-[#E5322D]/10"><Icon name="close" className="text-[20px]" /></button>
        </header>

        {view === "list" ? <MyList sent={sent} onNew={() => { setSent(false); setView("form"); }} /> : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
              <div className="flex min-h-0 min-w-0 flex-col gap-2 p-4 sm:p-5 lg:overflow-y-auto">
                <p className="flex items-start gap-2 rounded-xl bg-ds-primary/5 px-3 py-2 text-xs leading-snug text-ds-text-muted"><Icon name="ads_click" className="mt-px shrink-0 text-[16px] text-ds-primary" />{base ? "Clique na imagem onde a melhoria deve entrar e escreva o que fazer ali (um ponto por vez). Arraste o ponto para reposicionar. Também dá para desenhar para destacar uma área." : "Não foi possível capturar a tela, mas você ainda pode enviar a sugestão descrevendo ao lado."}</p>
                {base && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setTool("pin")} className={toolBtn(tool === "pin")}><Icon name="location_on" className="text-[16px]" />Marcar ponto</button>
                      <button type="button" onClick={() => setTool("draw")} className={toolBtn(tool === "draw")}><Icon name="draw" className="text-[16px]" />Desenhar</button>
                      <button type="button" onClick={() => { setEditing(null); setMarks((m) => m.slice(0, -1)); }} disabled={!marks.length} className={`${toolBtn(false)} disabled:opacity-40`}><Icon name="undo" className="text-[16px]" />Desfazer</button>
                      <button type="button" onClick={() => { setEditing(null); setMarks([]); }} disabled={!marks.length} className={`${toolBtn(false)} disabled:opacity-40`}><Icon name="delete" className="text-[16px]" />Limpar</button>
                    </div>
                    <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-xl border border-ds-border bg-ds-bg p-1.5">
                      <div className="relative inline-block max-w-full">
                        <canvas ref={canvasRef} width={size.w} height={size.h} onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={release} className="block h-auto max-h-[62dvh] w-auto max-w-full sm:max-h-[calc(94vh-250px)] cursor-crosshair touch-none select-none rounded-lg" />
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
              <div className="flex min-w-0 flex-col gap-3 border-t border-ds-border-subtle p-4 sm:p-5 lg:overflow-y-auto lg:border-l lg:border-t-0">
                <label className="flex min-h-0 flex-1 flex-col"><span className="mb-1 block text-xs font-bold text-ds-text-secondary">Detalhes da melhoria</span>
                  <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={4000} rows={6} disabled={sending} placeholder="Descreva a melhoria: o que você gostaria que mudasse e por quê." className="min-h-[140px] w-full flex-1 resize-none rounded-[10px] border border-ds-border bg-white px-3 py-2.5 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" /></label>
                {pinCount > 0 && <p className="text-xs text-ds-text-secondary">{pinCount} {pinCount === 1 ? "ponto marcado" : "pontos marcados"} na imagem.</p>}
                {error && <p role="alert" className="text-sm font-medium text-ds-danger-text">{error}</p>}
              </div>
            </div>
            <footer className="flex gap-2 border-t border-ds-border-subtle px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-3">
              <button type="button" onClick={onClose} disabled={sending} className="h-11 flex-1 rounded-[10px] border border-ds-border text-sm font-semibold text-ds-text-muted hover:border-ds-primary sm:flex-none sm:px-8">Cancelar</button>
              <button type="button" onClick={() => void send()} disabled={sending} className="btn-add inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] text-sm font-bold text-white disabled:opacity-60 sm:ml-auto sm:flex-none sm:px-10">{sending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Enviando...</> : "Enviar sugestão"}</button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

const fmt = (iso: string) => `${new Date(iso).toLocaleDateString("pt-BR")} às ${new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

function MyList({ sent, onNew }: { sent: boolean; onNew: () => void }) {
  const [items, setItems] = useState<MySuggestion[] | null>(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);
  useEffect(() => { listMySuggestions().then(setItems).catch((e) => { setError(e instanceof Error ? e.message : "Não foi possível carregar."); setItems([]); }); }, []);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
      {sent && <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-[#DDF6EA] px-3 py-2.5 text-sm font-semibold text-[#0B7A4B]"><Icon name="check_circle" className="text-[20px]" />Sugestão enviada! Ela aparece abaixo como pendente. Obrigado por ajudar a melhorar o sistema.</p>}
      {error && <p role="alert" className="mb-3 text-sm text-ds-danger-text">{error}</p>}
      {!items ? <p className="py-10 text-center text-sm text-ds-text-secondary">Carregando...</p> : items.length === 0 ? (
        <div className="py-10 text-center text-sm text-ds-text-secondary">Você ainda não enviou sugestões.<br /><button type="button" onClick={onNew} className="mt-3 font-semibold text-ds-primary hover:underline">Enviar a primeira</button></div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="flex gap-3 rounded-2xl border border-ds-border-subtle bg-white p-3">
              {s.imageUrl ? (
                <button type="button" onClick={() => setZoom(s.imageUrl)} aria-label="Ampliar imagem" className="shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-ds-border-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.imageUrl} alt="" className="h-20 w-28 object-cover object-top" />
                </button>
              ) : <span className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-ds-bg text-ds-text-secondary"><Icon name="image_not_supported" className="text-[24px]" /></span>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-ds-text-secondary">{s.screenTitle}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_INFO[s.status].cls}`}>{STATUS_INFO[s.status].label}</span></div>
                <p className="mt-1 line-clamp-2 break-words text-sm text-ds-text">{s.description.split(/\n\nObservações/)[0]}</p>
                <p className="mt-1 text-[11px] text-ds-text-secondary">{fmt(s.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {zoom && (
        <div role="dialog" aria-label="Imagem ampliada" onClick={() => setZoom(null)} className="fixed inset-0 z-[70] flex cursor-zoom-out items-center justify-center bg-black/80 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}
