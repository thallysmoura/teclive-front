"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { COMERCIAL_KEYS, eventsClient, type CalendarEvent } from "@/lib/comercial";
import type { Me } from "@/lib/api";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

type View = "month" | "week" | "day";
const VIEW_LABEL: Record<View, string> = { month: "Mês", week: "Semana", day: "Dia" };
const WEEKDAYS = ["Dom.", "Seg.", "Ter.", "Qua.", "Qui.", "Sex.", "Sáb."];
const COLORS = ["bg-ds-primary text-white", "bg-ds-success text-white", "bg-ds-info text-white", "bg-ds-warning text-ds-warning-text", "bg-ds-primary-deep text-white"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const pad = (n: number) => String(n).padStart(2, "0");
const toInput = (d: Date, allDay: boolean) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}${allDay ? "" : `T${pad(d.getHours())}:${pad(d.getMinutes())}`}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function rangeOf(view: View, anchor: Date) {
  if (view === "day") return { from: startOfDay(anchor), until: addDays(startOfDay(anchor), 1) };
  if (view === "week") { const from = addDays(startOfDay(anchor), -anchor.getDay()); return { from, until: addDays(from, 7) }; }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const from = addDays(first, -first.getDay());
  return { from, until: addDays(from, 42) };
}

function EventModal({ open, event, day, onClose, onSaved }: { open: boolean; event: CalendarEvent | null; day: Date; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (event) { setTitle(event.title); setAllDay(event.allDay); setStart(toInput(new Date(event.startsAt), event.allDay)); setEnd(toInput(new Date(event.endsAt), event.allDay)); setDescription(event.description ?? ""); }
    else {
      const s = new Date(day.getFullYear(), day.getMonth(), day.getDate(), sameDay(day, new Date()) ? new Date().getHours() + 1 : 9, 0);
      setTitle(""); setAllDay(false); setStart(toInput(s, false)); setEnd(toInput(new Date(s.getTime() + 3600000), false)); setDescription("");
    }
  }, [open, event, day]);

  function toggleAllDay(value: boolean) {
    setAllDay(value);
    setStart((s) => (value ? s.slice(0, 10) : `${s.slice(0, 10)}T09:00`));
    setEnd((e) => (value ? e.slice(0, 10) : `${e.slice(0, 10)}T10:00`));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Informe o título do evento.");
    if (!start || !end) return setError("Informe o início e o fim.");
    setSaving(true); setError("");
    const startsAt = allDay ? new Date(`${start}T00:00:00`) : new Date(start);
    const endsAt = allDay ? new Date(`${end}T23:59:59`) : new Date(end);
    try {
      const input = { title: title.trim(), startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), allDay, description };
      if (event) await eventsClient.update(event.id, input); else await eventsClient.create(input);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar o evento."); setSaving(false); }
  }

  async function remove() {
    if (!event || !window.confirm(`Excluir o evento "${event.title}"?`)) return;
    setSaving(true);
    try { await eventsClient.remove(event.id); onSaved(); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível excluir o evento."); setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="event-title">
      <form onSubmit={submit} noValidate>
        <h2 id="event-title" className="mb-4 text-lg font-bold text-ds-primary-deep">{event ? "Editar Evento" : "Novo Evento"}</h2>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5"><FieldLabel>Título <span className="text-ds-danger">*</span></FieldLabel><Input autoFocus value={title} maxLength={200} onChange={(e) => { setTitle(e.target.value); setError(""); }} /></label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ds-text"><input type="checkbox" checked={allDay} onChange={(e) => toggleAllDay(e.target.checked)} className="h-4 w-4 accent-ds-primary" />Dia inteiro</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><FieldLabel>Início</FieldLabel><Input type={allDay ? "date" : "datetime-local"} value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="flex flex-col gap-1.5"><FieldLabel>Fim</FieldLabel><Input type={allDay ? "date" : "datetime-local"} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
          <label className="flex flex-col gap-1.5"><FieldLabel>Descrição</FieldLabel><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-[10px] border border-ds-border bg-white px-3 py-2 text-sm outline-none focus:border-ds-primary" /></label>
          {event && <p className="text-xs text-ds-text-secondary">Criado por {event.ownerName}</p>}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-ds-danger-text">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-ds-border-subtle pt-4">
          {event ? <Button type="button" variant="danger" disabled={saving} onClick={remove}>Excluir</Button> : <span />}
          <span className="flex gap-3"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></span>
        </div>
      </form>
    </Modal>
  );
}

function Agenda({ user }: { user: Me }) {
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [owners, setOwners] = useState<string[]>([user.id]);
  const [usersOpen, setUsersOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editor, setEditor] = useState<{ event: CalendarEvent | null; day: Date } | null>(null);
  const [error, setError] = useState("");

  const range = useMemo(() => rangeOf(view, anchor), [view, anchor]);
  const load = useCallback(() => eventsClient.list(range.from.toISOString(), range.until.toISOString(), owners).then(setEvents).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar a agenda.")), [range, owners]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { eventsClient.owners().then(setUsers).catch(() => {}); }, []);

  const colorOf = (ownerId: string | null) => COLORS[Math.max(0, users.findIndex((u) => u.id === ownerId)) % COLORS.length];
  const eventsOn = (day: Date) => events.filter((e) => { const s = startOfDay(new Date(e.startsAt)), f = startOfDay(new Date(e.endsAt)); return day >= s && day <= f; });
  const days = Array.from({ length: view === "month" ? 42 : view === "week" ? 7 : 1 }, (_, i) => addDays(range.from, i));

  function move(direction: number) {
    setAnchor((a) => (view === "month" ? new Date(a.getFullYear(), a.getMonth() + direction, 1) : addDays(a, direction * (view === "week" ? 7 : 1))));
  }
  const title = view === "month"
    ? anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase()).replace(" de ", ", ")
    : view === "week"
      ? `${range.from.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${addDays(range.until, -1).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
      : anchor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const chip = (e: CalendarEvent) => (
    <button key={e.id} type="button" onClick={(ev) => { ev.stopPropagation(); setEditor({ event: e, day: new Date(e.startsAt) }); }} title={`${e.title} · ${e.ownerName}`} className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${colorOf(e.ownerId)}`}>
      {!e.allDay && <span className="mr-1 opacity-80">{time(e.startsAt)}</span>}{e.title}
    </button>
  );

  return (
    <div onClick={() => { setUsersOpen(false); setViewOpen(false); }}>
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Agenda Comercial" }]} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ds-primary-deep">Agenda</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-ds-primary-deep px-3 py-1.5 text-xs font-semibold text-ds-primary-deep">{user.name.split(" ")[0].toLowerCase()} (Você)</span>
          <div className="relative">
            <button type="button" onClick={(e) => { e.stopPropagation(); setUsersOpen((o) => !o); setViewOpen(false); }} className="inline-flex items-center gap-1.5 rounded-lg bg-ds-primary-deep px-3 py-1.5 text-sm font-semibold text-white"><Icon name="group" className="text-[16px]" />Usuários<span className="rounded-full bg-white px-1.5 text-xs font-bold text-ds-primary-deep">{owners.length}</span><Icon name="arrow_drop_down" className="text-[18px]" /></button>
            {usersOpen && (
              <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-10 z-30 w-60 rounded-xl border border-ds-border-subtle bg-white p-2 shadow-xl">
                {users.map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-ds-bg"><input type="checkbox" checked={owners.includes(u.id)} onChange={(e) => setOwners((o) => (e.target.checked ? [...o, u.id] : o.filter((x) => x !== u.id)))} className="h-4 w-4 accent-ds-primary" /><span className={`h-2.5 w-2.5 rounded-full ${colorOf(u.id).split(" ")[0]}`} />{u.name}</label>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => setEditor({ event: null, day: anchor })} className="btn-add inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-bold text-white"><Icon name="add" className="text-[18px]" />Novo Evento</button>
        </div>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}

      <section className="rounded-xl border border-ds-border-subtle bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setAnchor(startOfDay(new Date()))} className="rounded-lg bg-ds-primary-deep px-4 py-1.5 text-sm font-semibold text-white">Hoje</button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => move(-1)} aria-label="Anterior" className="flex h-8 w-8 items-center justify-center rounded-md text-ds-text-muted hover:bg-ds-bg"><Icon name="chevron_left" /></button>
            <h2 className="min-w-44 text-center text-base font-bold text-ds-primary-deep">{title}</h2>
            <button type="button" onClick={() => move(1)} aria-label="Próximo" className="flex h-8 w-8 items-center justify-center rounded-md text-ds-text-muted hover:bg-ds-bg"><Icon name="chevron_right" /></button>
          </div>
          <div className="relative">
            <button type="button" onClick={(e) => { e.stopPropagation(); setViewOpen((o) => !o); setUsersOpen(false); }} className="inline-flex items-center gap-1.5 rounded-lg border border-ds-primary-deep px-3 py-1.5 text-sm font-semibold text-ds-primary-deep"><Icon name="calendar_view_month" className="text-[16px]" />{VIEW_LABEL[view]}<Icon name="arrow_drop_down" className="text-[18px]" /></button>
            {viewOpen && (
              <ul className="absolute right-0 top-10 z-30 w-32 overflow-hidden rounded-lg border border-ds-border-subtle bg-white py-1 text-sm shadow-xl">
                {(Object.keys(VIEW_LABEL) as View[]).map((v) => <li key={v}><button type="button" onClick={() => { setView(v); setViewOpen(false); }} className={`w-full px-3 py-2 text-left hover:bg-ds-bg ${v === view ? "font-bold text-ds-primary-deep" : "text-ds-text"}`}>{VIEW_LABEL[v]}</button></li>)}
              </ul>
            )}
          </div>
        </div>

        {view === "month" && <div className="grid grid-cols-7 border-b border-ds-border-subtle pb-1 text-center text-xs font-semibold text-ds-text-muted">{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>}
        <div className={view === "month" ? "grid grid-cols-7 border-l border-ds-border-subtle" : view === "week" ? "grid grid-cols-1 gap-2 md:grid-cols-7" : "grid grid-cols-1 gap-2"}>
          {days.map((day) => {
            const today = sameDay(day, new Date());
            const list = eventsOn(day);
            const outside = view === "month" && day.getMonth() !== anchor.getMonth();
            const limit = view === "month" ? 3 : 99;
            return (
              <div key={day.toISOString()} onClick={() => setEditor({ event: null, day })} className={`flex cursor-pointer flex-col gap-1 ${view === "month" ? "min-h-24 border-b border-r border-ds-border-subtle p-1" : "min-h-32 rounded-lg border border-ds-border-subtle p-2"} hover:bg-ds-bg/60`}>
                <span className={`self-end text-xs ${today ? "flex h-6 w-6 items-center justify-center rounded-full border border-ds-primary-deep font-bold text-ds-primary-deep" : outside ? "text-ds-border" : "text-ds-text-secondary"}`}>{view === "month" ? day.getDate() : `${WEEKDAYS[day.getDay()]} ${day.getDate()}`}</span>
                {list.slice(0, limit).map(chip)}
                {list.length > limit && <span className="px-1 text-[11px] font-semibold text-ds-text-secondary">+{list.length - limit} mais</span>}
              </div>
            );
          })}
        </div>
      </section>

      <EventModal open={!!editor} event={editor?.event ?? null} day={editor?.day ?? anchor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); void load(); }} />
    </div>
  );
}

export default function CommercialAgendaPage() {
  return <PageShell permissionKey={COMERCIAL_KEYS.agenda}>{(user) => <Agenda user={user} />}</PageShell>;
}
