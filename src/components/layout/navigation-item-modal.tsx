"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createNavigationItem, deleteNavigationItem, renameNavigationItem, type NavigationItem } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Input, FieldLabel } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NavigationItemModal({ item, parent, canDelete, onClose, onSaved, onDeleted }: { item: NavigationItem | null; parent?: NavigationItem; canDelete: boolean; onClose: () => void; onSaved: (item: NavigationItem) => void; onDeleted: (item: NavigationItem) => void }) {
  const [label, setLabel] = useState(item?.label ?? "");
  const [embedUrl, setEmbedUrl] = useState(item?.embedUrl ?? "");
  const custom = !item || item.href?.startsWith("/items/");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [subItems, setSubItems] = useState<{ id: number; label: string; embedUrl: string }[]>([]);
  const nextId = useRef(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  async function remove() {
    if (!item || !canDelete || saving) return;
    setSaving(true);
    setError(null);
    try { await deleteNavigationItem(item.key); onDeleted(item); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível excluir o item."); }
    finally { setSaving(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const normalized = label.trim().replace(/\s+/g, " ");
    if (normalized.length < 2 || normalized.length > 80 || /[\u0000-\u001f\u007f]/.test(normalized)) {
      setError("Informe um nome com 2 a 80 caracteres.");
      ref.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    const url = embedUrl.trim();
    if (custom && url) {
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || url.length > 2048) throw new Error();
      } catch { setError("Informe uma URL HTTP ou HTTPS válida."); setSaving(false); return; }
    }
    for (const child of subItems) {
      const name = child.label.trim().replace(/\s+/g, " ");
      if (name.length < 2 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) { setError("Cada subitem precisa de um nome com 2 a 80 caracteres."); setSaving(false); return; }
      if (child.embedUrl.trim()) {
        try {
          const parsed = new URL(child.embedUrl.trim());
          if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || child.embedUrl.trim().length > 2048) throw new Error();
        } catch { setError(`Informe uma URL HTTP ou HTTPS válida para “${name}”.`); setSaving(false); return; }
      }
    }
    try { onSaved(await (item ? renameNavigationItem(item.key, normalized, custom ? url || null : undefined) : createNavigationItem(normalized, url || null, { parentKey: parent?.key, subItems: subItems.map((child) => ({ label: child.label.trim().replace(/\s+/g, " "), embedUrl: child.embedUrl.trim() || null })) }))); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível salvar o item."); }
    finally { setSaving(false); }
  }

  return (
    <Modal open onClose={() => { if (!saving) onClose(); }} labelledBy="navigation-item-title">
      <form onSubmit={save} noValidate className="flex min-h-full flex-col md:min-h-0">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="navigation-item-title" className="text-xl font-bold tracking-tight text-ds-primary-deep">{confirmDelete ? "Excluir item" : item ? "Editar item" : parent ? "Novo subitem" : "Novo item"}</h2>
            {parent && <p className="mt-1 break-words text-xs text-ds-text-secondary">{parent.label}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar" className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ds-text-secondary hover:bg-ds-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary disabled:opacity-40">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        </div>
        {confirmDelete ? <>
          <p className="mb-4 text-sm text-ds-text-secondary">“{item?.label}”, seus subitens e permissões serão removidos.</p>
          {error && <p role="alert" className="mb-3 text-sm text-ds-danger-text">{error}</p>}
          <div className="mt-auto flex gap-3 border-t border-ds-border-subtle pt-4 md:mt-2">
            <Button type="button" variant="secondary" disabled={saving} className="flex-1" onClick={() => setConfirmDelete(false)}>Voltar</Button>
            <Button type="button" disabled={saving} className="flex-1 !bg-ds-danger" onClick={() => { void remove(); }}>{saving ? "Excluindo..." : "Excluir item"}</Button>
          </div>
        </> : <>
        <label className="mb-4 flex flex-col gap-1.5">
          <FieldLabel>Nome</FieldLabel>
          <Input ref={ref} value={label} placeholder="Ex.: Inteligência Artificial" onChange={(event) => { setLabel(event.target.value); setError(null); }} maxLength={80} disabled={saving} required autoComplete="off" error={!!error} aria-invalid={!!error} aria-describedby={error ? "navigation-item-error" : undefined} />
        </label>
        {custom && <label className="mb-4 flex flex-col gap-1.5">
          <FieldLabel>Link (opcional)</FieldLabel>
          <Input type="url" value={embedUrl} onChange={(event) => { setEmbedUrl(event.target.value); setError(null); }} placeholder="https://exemplo.com" maxLength={2048} disabled={saving} autoComplete="off" />
          <span className="text-xs text-ds-text-secondary">O site precisa permitir exibição dentro da página.</span>
        </label>}
        {!item && !parent && <div className="mb-5 rounded-xl border border-ds-border-subtle bg-ds-bg/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ds-primary-deep">Subitens{subItems.length > 0 ? ` (${subItems.length})` : ""}</span>
            <button type="button" disabled={saving || subItems.length >= 20} onClick={() => setSubItems((previous) => [...previous, { id: nextId.current++, label: "", embedUrl: "" }])} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-ds-primary hover:bg-ds-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary disabled:opacity-40">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>Adicionar
            </button>
          </div>
          <div className="mt-2 space-y-3">
            {subItems.map((child, index) => <div key={child.id} className="space-y-2 rounded-lg border border-ds-border-subtle bg-white p-3">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-ds-text-secondary">Subitem {index + 1}</span><button type="button" disabled={saving} onClick={() => setSubItems((previous) => previous.filter((entry) => entry.id !== child.id))} aria-label={`Remover subitem ${index + 1}`} className="min-h-8 px-2 text-xs text-ds-danger-text">Remover</button></div>
              <Input aria-label={`Nome do subitem ${index + 1}`} placeholder="Nome do subitem" value={child.label} maxLength={80} disabled={saving} onChange={(event) => setSubItems((previous) => previous.map((entry) => entry.id === child.id ? { ...entry, label: event.target.value } : entry))} />
              <Input aria-label={`URL do subitem ${index + 1}`} type="url" placeholder="https://exemplo.com (opcional)" value={child.embedUrl} maxLength={2048} disabled={saving} onChange={(event) => setSubItems((previous) => previous.map((entry) => entry.id === child.id ? { ...entry, embedUrl: event.target.value } : entry))} />
            </div>)}
          </div>
        </div>}
        {error && <p id="navigation-item-error" role="alert" className="mb-3 text-sm text-ds-danger-text">{error}</p>}
        <div className="sticky bottom-0 mt-auto border-t border-ds-border-subtle bg-white pb-1 pt-4 md:mt-1">
        <div className="flex gap-3">
          <Button type="button" variant="secondary" disabled={saving} className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving} className="flex-1">{saving ? "Salvando..." : item ? "Salvar" : parent ? "Criar subitem" : "Criar item"}</Button>
        </div>
        {item && custom && canDelete && <button type="button" disabled={saving} onClick={() => { setError(null); setConfirmDelete(true); }} className="mt-4 min-h-11 w-full rounded-lg text-sm font-semibold text-ds-danger-text hover:bg-ds-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-danger disabled:opacity-40">Excluir item</button>}
        </div>
        </>}
      </form>
    </Modal>
  );
}
