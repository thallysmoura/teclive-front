"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";

/** Título de coluna clicável: seta ↑/↓ na coluna ativa e ↕ discreto nas demais. */
export function SortButton({ label, active, desc, onClick, className = "" }: { label: string; active: boolean; desc: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} title={`Ordenar por ${label}`} className={`inline-flex items-center gap-1 font-bold uppercase ${className}`}>
      {label}
      <Icon name={active ? (desc ? "arrow_downward" : "arrow_upward") : "unfold_more"} className={`text-[14px] ${active ? "opacity-100" : "opacity-50"}`} />
    </button>
  );
}

export const ariaSort = (active: boolean, desc: boolean): "ascending" | "descending" | "none" => (active ? (desc ? "descending" : "ascending") : "none");

type Value = string | number | boolean | null | undefined;

/** Ordenação no navegador para tabelas pequenas (sem paginação no servidor). */
export function useSort<T>(rows: T[], accessors: Record<string, (row: T) => Value>, initial?: { key: string; desc?: boolean }) {
  const [key, setKey] = useState<string | null>(initial?.key ?? null);
  const [desc, setDesc] = useState(initial?.desc ?? false);

  const sorted = useMemo(() => {
    const get = key ? accessors[key] : undefined;
    if (!get) return rows;
    const direction = desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === "number" && typeof y === "number") return (x - y) * direction;
      if (typeof x === "boolean" && typeof y === "boolean") return (Number(x) - Number(y)) * direction;
      return String(x).localeCompare(String(y), "pt-BR", { numeric: true, sensitivity: "base" }) * direction;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, key, desc]);

  const toggle = (next: string) => { if (key === next) setDesc((d) => !d); else { setKey(next); setDesc(false); } };
  /** Props prontas para <SortButton /> + aria-sort do <th>. */
  const header = (name: string, label: string) => ({ label, active: key === name, desc, onClick: () => toggle(name) });
  return { sorted, header, ariaSort: (name: string) => ariaSort(key === name, desc) };
}
