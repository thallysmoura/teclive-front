"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { btnGhost, card, field } from "@/components/contratos/admin-ui";
import { FIN_KEYS, fin, type Category } from "@/lib/financeiro";

function Node({ c, kids, depth, open, toggle, onAdd, onRename, onDelete, search }: { c: Category; kids: Map<string | null, Category[]>; depth: number; open: Set<string>; toggle: (id: string) => void; onAdd: (c: Category) => void; onRename: (c: Category) => void; onDelete: (c: Category) => void; search: string }) {
  const children = kids.get(c.id) ?? [];
  const isOpen = open.has(c.id) || !!search;
  return (
    <li>
      <div className="group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-ds-bg" style={{ paddingLeft: 8 + depth * 20 }}>
        <button type="button" onClick={() => toggle(c.id)} aria-label={isOpen ? "Recolher" : "Expandir"} className="flex h-6 w-6 items-center justify-center text-ds-text-secondary">{children.length > 0 ? <Icon name={isOpen ? "expand_more" : "chevron_right"} className="text-[20px]" /> : <span className="h-1.5 w-1.5 rounded-full bg-ds-border" />}</button>
        <span className={`min-w-0 flex-1 truncate text-sm ${depth === 0 ? "font-extrabold text-ds-primary-deep" : depth === 1 ? "font-bold text-ds-primary-deep" : "text-ds-text"} ${c.isActive ? "" : "line-through opacity-50"}`}>{c.name}</span>
        <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {c.level < 4 && <button type="button" onClick={() => onAdd(c)} aria-label={`Adicionar subcategoria em ${c.name}`} title="Adicionar subcategoria" className="text-ds-primary"><Icon name="add_circle" className="text-[18px]" /></button>}
          {c.level > 1 && <button type="button" onClick={() => onRename(c)} aria-label={`Renomear ${c.name}`} title="Renomear" className="text-ds-primary"><Icon name="edit" className="text-[18px]" /></button>}
          {c.level > 1 && <button type="button" onClick={() => onDelete(c)} aria-label={`Excluir ${c.name}`} title="Excluir" className="text-ds-danger-text"><Icon name="delete" className="text-[18px]" /></button>}
        </span>
      </div>
      {isOpen && children.length > 0 && <ul>{children.map((k) => <Node key={k.id} c={k} kids={kids} depth={depth + 1} open={open} toggle={toggle} onAdd={onAdd} onRename={onRename} onDelete={onDelete} search={search} />)}</ul>}
    </li>
  );
}

function Categories() {
  const [all, setAll] = useState<Category[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => fin.categories().then((c) => { setAll(c); setOpen((o) => (o.size ? o : new Set(c.filter((x) => x.level === 1).map((x) => x.id)))); }).catch(() => setAll([])), []);
  useEffect(() => { void load(); }, [load]);

  const term = q.trim().toLowerCase();
  const list = useMemo(() => {
    if (!all || !term) return all ?? [];
    const byId = new Map(all.map((c) => [c.id, c])); const keep = new Set<string>();
    for (const c of all) if (c.name.toLowerCase().includes(term)) { let x: Category | undefined = c; while (x) { keep.add(x.id); x = x.parentId ? byId.get(x.parentId) : undefined; } }
    return all.filter((c) => keep.has(c.id));
  }, [all, term]);
  const kids = useMemo(() => { const m = new Map<string | null, Category[]>(); for (const c of list) { const a = m.get(c.parentId) ?? []; a.push(c); m.set(c.parentId, a); } return m; }, [list]);
  const run = async (fn: () => Promise<unknown>) => { setError(""); try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir."); } };
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="mx-auto max-w-[900px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Categorias" }]} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-ds-primary-deep">Categorias de Receitas/Despesas</h1><div className="flex gap-2"><button type="button" onClick={() => setOpen(new Set((all ?? []).map((c) => c.id)))} className={btnGhost}>Expandir tudo</button><button type="button" onClick={() => setOpen(new Set())} className={btnGhost}>Recolher tudo</button></div></header>
      <div className={`${card} mb-4 p-3`}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar categoria" className={field} /></div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      <div className={`${card} p-2`}>{!all ? <p className="py-10 text-center text-sm text-ds-text-secondary">Carregando...</p> : <ul>{(kids.get(null) ?? []).map((c) => <Node key={c.id} c={c} kids={kids} depth={0} open={open} toggle={toggle} search={term}
        onAdd={(p) => { const name = window.prompt(`Nova subcategoria em "${p.name}":`); if (name?.trim()) void run(() => fin.createCategory({ name, parentId: p.id })).then(() => setOpen((o) => new Set(o).add(p.id))); }}
        onRename={(c2) => { const name = window.prompt("Novo nome:", c2.name); if (name?.trim() && name.trim() !== c2.name) void run(() => fin.updateCategory(c2.id, { name })); }}
        onDelete={(c2) => { if (window.confirm(`Excluir a categoria "${c2.name}"?`)) void run(() => fin.deleteCategory(c2.id)); }} />)}</ul>}</div>
    </div>
  );
}

export default function CategoriesPage() { return <PageShell permissionKey={FIN_KEYS.categorias}>{() => <Categories />}</PageShell>; }
