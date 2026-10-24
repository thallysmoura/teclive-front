"use client";

import { useEffect, useRef, useState } from "react";
import { leadsClient, type ClientOption } from "@/lib/comercial";
import { formatDocument } from "@/lib/cadastros";
import { Icon } from "@/components/ui/icon";

/** Seleção de cliente / lead com busca (nome, apelido ou CPF/CNPJ). */
export function ClientPicker({ value, onChange, placeholder = "Selecione..." }: { value: { id: string; name: string } | null; onChange: (value: ClientOption | null) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timer = setTimeout(() => leadsClient.options(q).then(setOptions).catch(() => setOptions([])).finally(() => setLoading(false)), 200);
    return () => clearTimeout(timer);
  }, [open, q]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} className="flex h-11 w-full items-center justify-between rounded-[10px] border border-ds-border bg-white px-3 text-left text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20">
        <span className={value ? "truncate" : "text-ds-text-secondary"}>{value?.name ?? placeholder}</span>
        <Icon name="arrow_drop_down" className="text-[20px] text-ds-text-secondary" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-xl border border-ds-border-subtle bg-white shadow-xl">
          <div className="relative border-b border-ds-border-subtle p-2">
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-ds-text-secondary" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="h-9 w-full rounded-lg border border-ds-border pl-8 pr-2 text-sm outline-none focus:border-ds-primary" />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {options.map((o) => (
              <li key={o.id}>
                <button type="button" role="option" aria-selected={value?.id === o.id} onClick={() => { onChange(o); setOpen(false); }} className="flex w-full flex-col px-3 py-2 text-left hover:bg-ds-bg">
                  <span className="flex items-center gap-2 text-sm font-medium text-ds-text">{o.name}{o.isLead && <span className="rounded-full bg-ds-primary-deep px-2 py-0.5 text-[10px] font-bold text-white">Lead</span>}</span>
                  <span className="text-xs text-ds-text-secondary">{o.document ? formatDocument(o.document) : "CPF/CNPJ não informado"}</span>
                </button>
              </li>
            ))}
            {!loading && options.length === 0 && <li className="px-3 py-3 text-center text-sm text-ds-text-secondary">Nenhum resultado.</li>}
            {loading && <li className="px-3 py-3 text-center text-sm text-ds-text-secondary">Buscando...</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
