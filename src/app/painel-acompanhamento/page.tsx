"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import { subscribeOps } from "@/lib/presence";
import { EVENT_META, PAINEL_KEY, audioReady, fetchPanel, osNumber, playSound, unlockAudio, type OpsEvent, type OpsOrderRow, type OpsPanel } from "@/lib/painel";

type View = "geral" | "comentarios" | "impedimentos";
const VIEWS: { key: View; label: string; icon: string }[] = [
  { key: "geral", label: "Visão geral", icon: "dashboard" },
  { key: "comentarios", label: "Comentários", icon: "forum" },
  { key: "impedimentos", label: "Impedimentos", icon: "report" },
];

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}
const days = (iso: string | null, now: number) => (iso ? Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86400000)) : 0);

function Kpi({ label, value, icon, color, alert }: { label: string; value: number; icon: string; color: string; alert?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${alert && value > 0 ? "ring-1 ring-[#FF5C5C]/60" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-[clamp(11px,0.9vw,15px)] font-semibold uppercase tracking-wider text-white/60">{label}</span>
        <span style={{ color }}><Icon name={icon} className="text-[clamp(20px,1.6vw,30px)]" /></span>
      </div>
      <p className="mt-1 text-[clamp(30px,3.4vw,64px)] font-extrabold leading-none tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}

function FeedItem({ e, now, big }: { e: OpsEvent; now: number; big?: boolean }) {
  const m = EVENT_META[e.type];
  return (
    <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
      <UserAvatar name={e.userName} avatarUrl={e.avatarUrl} size={big ? 56 : 44} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={`font-bold text-white ${big ? "text-lg" : "text-[15px]"}`}>{e.userName}</span>
          <span className="text-sm text-white/60">{m.verb} OS</span>
          <span className="rounded-md px-1.5 py-0.5 text-sm font-extrabold" style={{ background: `${m.color}26`, color: m.color }}>{osNumber(e.orderNumber)}</span>
          <span className="ml-auto text-xs font-semibold text-white/45">{ago(e.createdAt, now)}</span>
        </div>
        {e.clientName && <p className="truncate text-xs text-white/50">{e.clientName}</p>}
        {e.text && <p className={`mt-1.5 whitespace-pre-wrap break-words text-white/90 ${big ? "text-lg" : "text-sm"}`}>{e.text}</p>}
        {e.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={e.imageUrl} alt="Anexo" className="mt-2 max-h-40 rounded-lg border border-white/10 object-cover" />}
      </div>
      <span className="shrink-0" style={{ color: m.color }}><Icon name={m.icon} className="text-[22px]" /></span>
    </li>
  );
}

function OrderList({ title, icon, color, rows, now, empty, big }: { title: string; icon: string; color: string; rows: OpsOrderRow[]; now: number; empty: string; big?: boolean }) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[clamp(14px,1.2vw,20px)] font-extrabold uppercase tracking-wider" style={{ color }}><Icon name={icon} className="text-[24px]" />{title}<span className="ml-auto rounded-full px-2.5 text-sm" style={{ background: `${color}26` }}>{rows.length}</span></h2>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {rows.length === 0 && <li className="py-6 text-center text-sm text-white/40">{empty}</li>}
        {rows.map((o) => (
          <li key={o.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
            <div className="flex items-center gap-2"><span className={`font-extrabold text-white ${big ? "text-lg" : ""}`}>OS {osNumber(o.number)}</span>
              <span className="ml-auto rounded-md px-1.5 text-xs font-bold" style={{ background: `${color}26`, color }}>{o.interruptedAt ? `parada há ${days(o.interruptedAt, now)} d` : o.scheduleEnd ? `venceu há ${Math.max(1, days(o.scheduleEnd, now))} d` : ""}</span></div>
            <p className="truncate text-sm text-white/70">{o.client}</p>
            <p className="truncate text-xs text-white/45">{[o.defect, o.technicians.join(", ")].filter(Boolean).join(" · ")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Panel() {
  const [data, setData] = useState<OpsPanel | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("geral");
  const [rotate, setRotate] = useState(false);
  const [sound, setSound] = useState(false);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [spot, setSpot] = useState<OpsEvent | null>(null);
  const queue = useRef<OpsEvent[]>([]);
  const spotBusy = useRef(false);
  const soundOn = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  const load = useCallback(() => fetchPanel().then((d) => { setData(d); setError(""); }).catch((e) => setError(e instanceof Error ? e.message : "Falha ao carregar.")), []);

  const nextSpot = useCallback(() => {
    const e = queue.current.shift();
    if (!e) { spotBusy.current = false; setSpot(null); return; }
    spotBusy.current = true;
    setSpot(e);
    if (soundOn.current) playSound(e.type);
    setTimeout(nextSpot, e.type === "interrupted" ? 12000 : 9000);
  }, []);

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 30000);
    const tick = setInterval(() => setNow(Date.now()), 15000);
    const off = subscribeOps((raw) => {
      const e = raw as OpsEvent;
      setData((d) => d ? { ...d, events: [e, ...d.events.filter((x) => x.id !== e.id)].slice(0, 40) } : d);
      queue.current.push(e);
      if (!spotBusy.current) nextSpot();
      void load();
    });
    const liveTimer = setInterval(() => setLive(navigator.onLine), 5000);
    setLive(navigator.onLine);
    // Navegadores só liberam som depois de um clique: libera no primeiro toque na tela.
    const unlock = () => { void unlockAudio().then((ok) => { soundOn.current = ok; setSound(ok); }); };
    if (audioReady()) unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => { off(); clearInterval(poll); clearInterval(tick); clearInterval(liveTimer); window.removeEventListener("pointerdown", unlock); };
  }, [load, nextSpot]);

  useEffect(() => {
    if (!rotate) return;
    const t = setInterval(() => setView((v) => VIEWS[(VIEWS.findIndex((x) => x.key === v) + 1) % VIEWS.length].key), 20000);
    return () => clearInterval(t);
  }, [rotate]);

  function toggleSound() {
    if (soundOn.current) { soundOn.current = false; setSound(false); return; }
    void unlockAudio().then((ok) => { soundOn.current = ok; setSound(ok); if (ok) playSound("comment"); });
  }
  const fullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void root.current?.requestFullscreen?.(); };

  const k = data?.kpis;
  const events = data?.events ?? [];
  const comments = events.filter((e) => e.type === "comment" || e.type === "attachment");
  const clock = new Date(now).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = new Date(now).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div ref={root} className="relative -m-4 flex min-h-[calc(100vh-4rem)] flex-col gap-4 bg-[#071a2e] p-4 text-white md:-m-6 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-[clamp(22px,2.4vw,40px)] font-extrabold leading-tight tracking-tight">Painel de Acompanhamento</h1>
          <p className="text-sm capitalize text-white/50">{date} · <span className="font-bold text-white/80">{clock}</span></p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${live && !error ? "bg-[#2ED58B]/15 text-[#2ED58B]" : "bg-[#FF5C5C]/15 text-[#FF5C5C]"}`}><span className={`h-2 w-2 rounded-full ${live && !error ? "animate-pulse bg-[#2ED58B]" : "bg-[#FF5C5C]"}`} />{live && !error ? "Ao vivo" : "Sem conexão"}</span>
        <nav className="flex rounded-xl border border-white/10 bg-white/5 p-1">
          {VIEWS.map((v) => <button key={v.key} type="button" onClick={() => setView(v.key)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${view === v.key ? "bg-[#005CD2] text-white" : "text-white/60 hover:text-white"}`}><Icon name={v.icon} className="text-[18px]" /><span className="hidden sm:inline">{v.label}</span></button>)}
        </nav>
        <button type="button" onClick={() => setRotate((r) => !r)} title="Alternar painéis automaticamente" className={`flex h-10 w-10 items-center justify-center rounded-xl border ${rotate ? "border-[#F7941D] bg-[#F7941D]/20 text-[#F7941D]" : "border-white/10 bg-white/5 text-white/70"}`}><Icon name="autoplay" className="text-[20px]" /></button>
        <button type="button" onClick={toggleSound} title={sound ? "Desligar som" : "Ativar som"} className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold ${sound ? "border-[#2ED58B]/50 bg-[#2ED58B]/15 text-[#2ED58B]" : "border-[#F7941D] bg-[#F7941D] text-white"}`}><Icon name={sound ? "volume_up" : "volume_off"} className="text-[20px]" />{sound ? "Som ligado" : "Ativar som"}</button>
        <button type="button" onClick={fullscreen} title="Tela cheia" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70"><Icon name="fullscreen" className="text-[22px]" /></button>
      </header>

      {error && !data && <p role="alert" className="rounded-xl bg-[#FF5C5C]/15 px-4 py-3 text-sm text-[#FF9C9C]">{error}</p>}

      {view === "geral" && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Kpi label="OS abertas" value={k?.open ?? 0} icon="build" color="#4DA3FF" />
            <Kpi label="Atrasadas" value={k?.late ?? 0} icon="schedule" color="#FFB020" alert />
            <Kpi label="Impedidas" value={k?.interrupted ?? 0} icon="report" color="#FF5C5C" alert />
            <Kpi label="Agendadas hoje" value={k?.scheduledToday ?? 0} icon="event" color="#9B7BFF" />
            <Kpi label="Fechadas hoje" value={k?.closedToday ?? 0} icon="check_circle" color="#2ED58B" />
            <Kpi label="Prontas p/ faturar" value={k?.ready ?? 0} icon="request_quote" color="#F7941D" />
            <Kpi label="Comentários hoje" value={k?.commentsToday ?? 0} icon="chat" color="#4DA3FF" />
          </div>
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="flex min-h-[320px] flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="mb-3 flex items-center gap-2 text-[clamp(14px,1.2vw,20px)] font-extrabold uppercase tracking-wider text-[#4DA3FF]"><Icon name="bolt" className="text-[24px]" />Atividade em tempo real</h2>
              <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 lg:max-h-[calc(100vh-22rem)]">
                {events.length === 0 && <li className="py-10 text-center text-white/40">Aguardando a primeira atividade... comentários, anexos e impedimentos aparecem aqui na hora.</li>}
                {events.map((e) => <FeedItem key={e.id} e={e} now={now} />)}
              </ul>
            </section>
            <div className="grid min-h-0 gap-4 lg:max-h-[calc(100vh-17rem)] lg:grid-rows-2">
              <OrderList title="Impedimentos" icon="report" color="#FF5C5C" rows={data?.interrupted ?? []} now={now} empty="Nenhuma obra impedida." />
              <OrderList title="Atrasadas" icon="schedule" color="#FFB020" rows={data?.late ?? []} now={now} empty="Nenhuma OS atrasada." />
            </div>
          </div>
        </>
      )}

      {view === "comentarios" && (
        <section className="min-h-0 flex-1">
          <ul className="mx-auto grid max-w-[1500px] gap-3 xl:grid-cols-2">
            {comments.length === 0 && <li className="col-span-full py-16 text-center text-lg text-white/40">Nenhum comentário ainda.</li>}
            {comments.map((e) => <FeedItem key={e.id} e={e} now={now} big />)}
          </ul>
        </section>
      )}

      {view === "impedimentos" && (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:max-h-[calc(100vh-9rem)]">
          <OrderList title="Obras impedidas" icon="report" color="#FF5C5C" rows={data?.interrupted ?? []} now={now} empty="Nenhuma obra impedida." big />
          <OrderList title="OS atrasadas" icon="schedule" color="#FFB020" rows={data?.late ?? []} now={now} empty="Nenhuma OS atrasada." big />
        </div>
      )}

      {spot && (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-[80] flex justify-center px-4">
          <div key={spot.id} className="pointer-events-auto flex w-full max-w-[920px] animate-[ops-in_.45s_ease-out] items-center gap-5 rounded-3xl border-2 bg-[#0B2A4A]/95 p-5 shadow-2xl backdrop-blur md:p-7" style={{ borderColor: EVENT_META[spot.type].color, boxShadow: `0 0 60px ${EVENT_META[spot.type].color}55` }}>
            <UserAvatar name={spot.userName} avatarUrl={spot.avatarUrl} size={96} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest" style={{ color: EVENT_META[spot.type].color }}><Icon name={EVENT_META[spot.type].icon} className="text-[22px]" />{EVENT_META[spot.type].label}</p>
              <p className="text-[clamp(20px,2.4vw,36px)] font-extrabold leading-tight text-white">{spot.userName} <span className="font-medium text-white/60">{EVENT_META[spot.type].verb}</span> OS {osNumber(spot.orderNumber)}</p>
              {spot.clientName && <p className="truncate text-base text-white/60">{spot.clientName}</p>}
              {spot.text && <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-[clamp(16px,1.6vw,26px)] text-white/90">“{spot.text}”</p>}
            </div>
            {spot.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={spot.imageUrl} alt="Anexo" className="hidden h-32 w-32 rounded-2xl object-cover sm:block" />}
          </div>
        </div>
      )}
      <style>{`@keyframes ops-in{from{opacity:0;transform:translateY(-30px) scale(.96)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

export default function PainelAcompanhamentoPage() {
  return <PageShell permissionKey={PAINEL_KEY}>{() => <Panel />}</PageShell>;
}
