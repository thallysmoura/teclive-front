"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { contractsApi } from "@/lib/contratos";

export const field = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20 disabled:bg-ds-bg";
export const label = "mb-1 block text-xs font-bold text-ds-text-secondary";
export const btnPrimary = "inline-flex h-10 items-center rounded-[10px] bg-[#F7941D] px-5 text-sm font-bold text-white hover:bg-[#E5850F] disabled:opacity-60";
export const btnGhost = "inline-flex h-10 items-center rounded-[10px] border border-ds-border bg-white px-4 text-sm font-semibold text-ds-primary-deep hover:border-ds-primary";
export const card = "rounded-2xl border border-ds-border-subtle bg-white shadow-sm";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-ds-primary-deep to-ds-primary px-5 py-3.5 text-white"><h2 className="text-base font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 hover:bg-white/15"><Icon name="close" className="text-[22px]" /></button></div>
        <div className="p-5">{children}</div>
      </div>
    </div>, document.body);
}

export function Pill({ ok, on = "Ativo", off = "Inativo" }: { ok: boolean; on?: string; off?: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ok ? "bg-[#DDF6EA] text-[#0B7A4B]" : "bg-[#ECEFF3] text-[#5B6775]"}`}>{ok ? on : off}</span>;
}

export function ContractPicker({ value, onPick }: { value: { id: string; label: string } | null; onPick: (c: { id: string; label: string }) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<{ id: string; number: string; personName: string }[]>([]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void contractsApi.list({ q, status: [0], page: 1 }).then((r) => setList(r.lista.slice(0, 10))).catch(() => setList([])), 250);
    return () => clearTimeout(t);
  }, [q, open]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={`${field} flex items-center justify-between text-left`}><span className={value ? "truncate" : "text-ds-text-secondary"}>{value?.label ?? "Selecione o contrato..."}</span><Icon name="arrow_drop_down" className="text-[20px] text-ds-text-secondary" /></button>
      {open && (
        <div className="absolute left-0 right-0 top-12 z-30 rounded-xl border border-ds-border-subtle bg-white p-2 shadow-xl">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número ou cliente" className="mb-2 h-10 w-full rounded-lg border border-ds-border px-3 text-sm outline-none focus:border-ds-primary" />
          <ul className="max-h-56 overflow-y-auto">
            {list.length === 0 && <li className="px-3 py-3 text-sm text-ds-text-secondary">Nenhum contrato ativo encontrado.</li>}
            {list.map((c) => <li key={c.id}><button type="button" onClick={() => { onPick({ id: c.id, label: `${c.number} - ${c.personName}` }); setOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-ds-bg"><span className="font-bold text-ds-primary">{c.number}</span> <span className="text-ds-text">- {c.personName}</span></button></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Empty({ cols, loading, text }: { cols: number; loading: boolean; text: string }) {
  return <tr><td colSpan={cols} className="py-10 text-center text-sm text-ds-text-secondary">{loading ? "Carregando..." : text}</td></tr>;
}
