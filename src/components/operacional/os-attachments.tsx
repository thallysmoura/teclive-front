"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ApiError, authFetch } from "@/lib/api";
import { fmtDateTime, type OsDetail } from "@/lib/operacional";

type Attachment = OsDetail["attachments"][number];
type Folder = { id: string; name: string };
type State = { folders: Folder[]; assign: Record<string, string> };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Não foi possível concluir a operação.");
  return body as T;
}

/** Anexos da OS organizados em pastas com nome livre; só administradores criam e movem. */
export function OsAttachments({ osId, attachments, canManage, onZoom }: { osId: string; attachments: Attachment[]; canManage: boolean; onZoom: (index: number) => void }) {
  const [state, setState] = useState<State>({ folders: [], assign: {} });
  const [error, setError] = useState("");
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const load = useCallback(() => call<State>(`/service-orders/${osId}/folders`).then(setState).catch(() => undefined), [osId]);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<unknown>) => { setError(""); try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir."); } };
  const newFolder = () => { const name = window.prompt("Nome da nova pasta:"); if (name?.trim()) void run(() => call(`/service-orders/${osId}/folders`, { method: "POST", body: JSON.stringify({ name }) })); };
  const rename = (f: Folder) => { const name = window.prompt("Novo nome da pasta:", f.name); if (name?.trim() && name.trim() !== f.name) void run(() => call(`/service-orders/${osId}/folders/${f.id}`, { method: "PUT", body: JSON.stringify({ name }) })); };
  const remove = (f: Folder) => { if (window.confirm(`Excluir a pasta "${f.name}"? Os anexos não são apagados: voltam para "Sem pasta".`)) void run(() => call(`/service-orders/${osId}/folders/${f.id}`, { method: "DELETE" })); };
  const move = (a: Attachment, folderId: string) => void run(() => call(`/service-orders/${osId}/folders/assign`, { method: "PUT", body: JSON.stringify({ attachmentId: String(a.ordemServicoArquivoId), folderId: folderId || null }) }));

  const folderOf = (a: Attachment) => state.assign[String(a.ordemServicoArquivoId)];
  const known = new Set(state.folders.map((f) => f.id));
  const loose = attachments.filter((a) => !known.has(folderOf(a)));
  const sections: { id: string; folder: Folder | null; items: Attachment[] }[] = [
    ...state.folders.map((f) => ({ id: f.id, folder: f, items: attachments.filter((a) => folderOf(a) === f.id) })),
    { id: "none", folder: null, items: loose },
  ];

  const card = (a: Attachment) => (
    <li key={a.ordemServicoArquivoId} className="overflow-hidden rounded-xl border border-ds-border-subtle text-xs">
      <button type="button" onClick={() => onZoom(attachments.indexOf(a))} aria-label={`Ampliar ${a.nomeArquivo}`} className="block aspect-video w-full cursor-zoom-in bg-ds-bg">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={a.url} alt={a.legenda ?? a.nomeArquivo} loading="lazy" className="h-full w-full object-cover" /></button>
      <div className="p-2">
        <p className="truncate font-semibold text-ds-primary-deep">{a.nomeArquivo}.{a.extensaoArquivo}</p>
        <p className="text-ds-text-secondary">{a.nomeUsuario} · {fmtDateTime(a.dataAnexo)}</p>
        {canManage && (
          <label className="mt-1.5 flex items-center gap-1.5 text-ds-text-secondary"><Icon name="folder_open" className="text-[16px]" />
            <select value={folderOf(a) && known.has(folderOf(a)) ? folderOf(a) : ""} onChange={(e) => move(a, e.target.value)} aria-label={`Mover ${a.nomeArquivo} para uma pasta`} className="h-7 min-w-0 flex-1 rounded-md border border-ds-border bg-white px-1.5 text-xs text-ds-text outline-none focus:border-ds-primary">
              <option value="">Sem pasta</option>{state.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
        )}
      </div>
    </li>
  );

  return (
    <div>
      {(canManage || state.folders.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold text-ds-primary-deep"><Icon name="folder" className="text-[20px] text-[#F7941D]" />Pastas ({state.folders.length})</span>
          {canManage && <button type="button" onClick={newFolder} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#F7941D] px-3 text-sm font-bold text-white hover:bg-[#E5850F]"><Icon name="create_new_folder" className="text-[18px]" />Nova pasta</button>}
        </div>
      )}
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      <div className="space-y-4">
        {sections.map((sec) => {
          if (!sec.folder && state.folders.length > 0 && sec.items.length === 0) return null;
          const open = !closed.has(sec.id);
          return (
            <section key={sec.id} className={sec.folder ? "rounded-xl border border-ds-border-subtle bg-ds-bg/40 p-3" : ""}>
              {sec.folder ? (
                <header className="flex items-center gap-2">
                  <button type="button" onClick={() => setClosed((s) => { const n = new Set(s); if (n.has(sec.id)) n.delete(sec.id); else n.add(sec.id); return n; })} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Icon name={open ? "folder_open" : "folder"} className="text-[22px] text-[#F7941D]" /><span className="truncate font-bold text-ds-primary-deep">{sec.folder.name}</span><span className="rounded-full bg-white px-2 text-xs font-semibold text-ds-text-secondary">{sec.items.length}</span></button>
                  {canManage && <><button type="button" onClick={() => rename(sec.folder!)} aria-label={`Renomear ${sec.folder.name}`} title="Renomear" className="text-ds-primary hover:text-ds-primary-deep"><Icon name="edit" className="text-[18px]" /></button><button type="button" onClick={() => remove(sec.folder!)} aria-label={`Excluir ${sec.folder.name}`} title="Excluir pasta" className="text-ds-danger-text"><Icon name="delete" className="text-[18px]" /></button></>}
                </header>
              ) : state.folders.length > 0 && <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-ds-text-muted"><Icon name="folder_off" className="text-[18px]" />Sem pasta <span className="text-xs font-semibold text-ds-text-secondary">({sec.items.length})</span></h4>}
              {open && (sec.items.length ? <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${sec.folder ? "mt-3" : ""}`}>{sec.items.map(card)}</ul> : sec.folder && <p className="mt-2 text-sm text-ds-text-secondary">Pasta vazia{canManage ? ": use \"Mover para\" em um anexo para colocar aqui." : "."}</p>)}
            </section>
          );
        })}
      </div>
    </div>
  );
}
