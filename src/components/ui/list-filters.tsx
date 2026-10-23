"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, FieldLabel } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { EMPTY_FILTERS, type ListFilters as Filters } from "@/lib/list-filters";

export function ListFilters({ dateLabel, busy = false, onApply }: { dateLabel: string; busy?: boolean; onApply: (filters: Filters) => void }) {
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const error = Boolean(draft.from && draft.to && draft.from > draft.to);
  const lastApplied = useRef(JSON.stringify(EMPTY_FILTERS));
  const applyFilters = useEffectEvent(onApply);
  useEffect(() => {
    if (error) return;
    const next = { ...draft, search: draft.search.trim() };
    const signature = JSON.stringify(next);
    if (signature === lastApplied.current) return;
    const timer = setTimeout(() => { lastApplied.current = signature; applyFilters(next); }, 300);
    return () => clearTimeout(timer);
  }, [draft, error]);
  function change(key: keyof Filters, value: string) { setDraft((previous) => ({ ...previous, [key]: value })); }
  return <form aria-label="Filtros da listagem" aria-busy={busy} onSubmit={(event) => event.preventDefault()} className="mb-5 rounded-xl border border-ds-border-subtle bg-white p-4">
    <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(145px,auto)_minmax(145px,auto)_auto]">
      <label className="flex min-w-0 flex-col gap-1.5"><FieldLabel>Nome ou e-mail</FieldLabel><div className="relative"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" /><Input type="search" value={draft.search} maxLength={100} placeholder="Buscar pessoa..." onChange={(event) => change("search", event.target.value)} className="pl-10" /></div></label>
      <label className="flex min-w-0 flex-col gap-1.5"><FieldLabel>{dateLabel} · De</FieldLabel><Input type="date" value={draft.from} max={draft.to || undefined} onChange={(event) => change("from", event.target.value)} className="min-w-0" /></label>
      <label className="flex min-w-0 flex-col gap-1.5"><FieldLabel>Até</FieldLabel><Input type="date" value={draft.to} min={draft.from || undefined} onChange={(event) => change("to", event.target.value)} className="min-w-0" /></label>
      <Button type="button" variant="secondary" onClick={() => setDraft(EMPTY_FILTERS)}>Limpar</Button>
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-ds-danger-text">A data final deve ser igual ou posterior à inicial.</p>}
  </form>;
}
