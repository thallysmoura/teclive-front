"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockScroll } from "@/lib/scroll-lock";

type TextReq = { kind: "text"; title: string; label: string; initial?: string; placeholder?: string; confirmLabel?: string; resolve: (v: string | null) => void };
type ConfirmReq = { kind: "confirm"; title: string; message: string; confirmLabel?: string; danger?: boolean; resolve: (v: boolean) => void };
type Req = TextReq | ConfirmReq;

let push: ((r: Req) => void) | null = null;

/** Substitui window.prompt: janela do sistema pedindo um texto (null se cancelar). */
export function askText(o: { title: string; label: string; initial?: string; placeholder?: string; confirmLabel?: string }): Promise<string | null> {
  return new Promise((resolve) => { if (push) push({ kind: "text", ...o, resolve }); else resolve(window.prompt(o.label, o.initial)); });
}

/** Substitui window.confirm: janela do sistema pedindo confirmação. */
export function askConfirm(o: { title: string; message: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => { if (push) push({ kind: "confirm", ...o, resolve }); else resolve(window.confirm(o.message)); });
}

/** Montado uma vez no layout raiz: exibe as janelas acima de qualquer tela, modal ou tela cheia. */
export function DialogHost() {
  const [queue, setQueue] = useState<Req[]>([]);
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const req = queue[0];

  useEffect(() => { push = (r) => setQueue((q) => [...q, r]); return () => { push = null; }; }, []);
  useEffect(() => { if (req?.kind === "text") setValue(req.initial ?? ""); }, [req]);
  useEffect(() => { if (!req) return; const unlock = lockScroll(); return unlock; }, [req]);
  useEffect(() => { if (req?.kind === "text") input.current?.select(); }, [req]);

  if (!req || typeof document === "undefined") return null;
  const close = (result: string | boolean | null) => {
    if (req.kind === "text") req.resolve(typeof result === "string" ? result : null); else req.resolve(result === true);
    setQueue((q) => q.slice(1));
  };
  const cancel = () => close(req.kind === "text" ? null : false);
  const ok = () => { if (req.kind === "text") { if (value.trim()) close(value.trim()); } else close(true); };
  const danger = req.kind === "confirm" && req.danger !== false;

  return createPortal(
    <div className="fixed inset-0 z-[3000] flex items-center justify-center overflow-y-auto bg-[#0b1620]/55 p-4 backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); cancel(); } }}>
      <div role="dialog" aria-modal="true" aria-label={req.title} className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-ds-primary-deep to-ds-primary px-5 py-3.5 text-white">
          <h2 className="text-base font-bold">{req.title}</h2>
          <button type="button" onClick={cancel} aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/15"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span></button>
        </div>
        <form className="p-5" onSubmit={(e) => { e.preventDefault(); ok(); }}>
          {req.kind === "text" ? (
            <label className="block text-xs font-bold text-ds-text-secondary">{req.label}
              <input ref={input} autoFocus value={value} onChange={(e) => setValue(e.target.value)} maxLength={200} placeholder={req.placeholder} className="mt-1.5 h-11 w-full rounded-[10px] border border-ds-border px-3 text-sm font-normal text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20" />
            </label>
          ) : <p className="whitespace-pre-wrap text-sm text-ds-text">{req.message}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={cancel} className="inline-flex h-10 items-center rounded-[10px] border border-ds-border bg-white px-4 text-sm font-semibold text-ds-primary-deep hover:border-ds-primary">Cancelar</button>
            <button type="submit" autoFocus={req.kind === "confirm"} disabled={req.kind === "text" && !value.trim()} className={`inline-flex h-10 items-center rounded-[10px] px-5 text-sm font-bold text-white disabled:opacity-60 ${danger ? "bg-[#D92D20] hover:bg-[#B42318]" : "bg-[#F7941D] hover:bg-[#E5850F]"}`}>{req.confirmLabel ?? (req.kind === "text" ? "Salvar" : "Confirmar")}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
