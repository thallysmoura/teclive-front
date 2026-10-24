"use client";

import { useEffect, useMemo, useState } from "react";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { OsDetailModal } from "@/components/operacional/os-detail";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { OPERACIONAL_KEYS, OS_STATUS, addressLine, fmtDate, formatOsNumber, osClient, type OperationsData } from "@/lib/operacional";

type Point = OperationsData["points"][number];

function Stat({ icon, label, value, tone = "text-ds-primary-deep" }: { icon: string; label: string; value: number; tone?: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-ds-border-subtle bg-white p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ds-primary/10 text-ds-primary"><Icon name={icon} className="!text-[22px]" /></span><div><p className={`text-2xl font-extrabold leading-none ${tone}`}>{value}</p><p className="mt-1 text-xs text-ds-text-secondary">{label}</p></div></div>;
}

/** Mapa (OpenStreetMap) centralizado nos pontos visíveis; o marcador acompanha a OS selecionada. */
function mapSrc(points: Point[], selected: Point | null) {
  const geo = points.filter((p) => p.lat !== null && p.lng !== null);
  if (!geo.length && !selected) return "https://www.openstreetmap.org/export/embed.html?bbox=-60.15,-3.18,-59.85,-2.95&layer=mapnik";
  const base = selected?.lat != null ? [selected] : geo;
  const lats = base.map((p) => p.lat as number), lngs = base.map((p) => p.lng as number);
  const pad = selected ? 0.006 : 0.02;
  const bbox = `${Math.min(...lngs) - pad},${Math.min(...lats) - pad},${Math.max(...lngs) + pad},${Math.max(...lats) + pad}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${selected?.lat != null ? `&marker=${selected.lat},${selected.lng}` : ""}`;
}

function Central() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"" | "late" | "noTech" | "noSchedule">("");
  const [selected, setSelected] = useState<Point | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { osClient.operations().then(setData).catch((e) => setError(e instanceof Error ? e.message : "Não foi possível carregar.")); }, []);

  const points = useMemo(() => (data?.points ?? []).filter((p) => {
    const t = q.trim().toLowerCase();
    if (t && !(p.personName.toLowerCase().includes(t) || formatOsNumber(p.number).includes(t) || addressLine(p.address).toLowerCase().includes(t))) return false;
    if (only === "late") return p.status === 1;
    if (only === "noTech") return p.technicians.length === 0;
    if (only === "noSchedule") return !p.scheduleStart;
    return true;
  }), [data, q, only]);

  const filters: { key: typeof only; label: string }[] = [{ key: "", label: "Todas" }, { key: "late", label: "Em atraso" }, { key: "noTech", label: "Sem técnico" }, { key: "noSchedule", label: "Sem agendamento" }];

  return (
    <div>
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Central de Operações" }]} />
      <h1 className="mb-5 text-xl font-bold text-ds-primary-deep">Central de Operações</h1>
      {error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{error}</p>}
      {!data ? <p className="py-10 text-center text-sm text-ds-text-secondary">Carregando...</p> : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon="assignment" label="OS em andamento" value={data.stats.open} />
            <Stat icon="alarm" label="Em atraso" value={data.stats.late} tone={data.stats.late ? "text-ds-danger-text" : "text-ds-primary-deep"} />
            <Stat icon="engineering" label="Sem técnico" value={data.stats.withoutTech} />
            <Stat icon="event_busy" label="Sem agendamento" value={data.stats.withoutSchedule} />
          </div>
          <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
            <section className="flex max-h-[calc(100vh-18rem)] min-h-[24rem] flex-col rounded-xl border border-ds-border-subtle bg-white">
              <div className="space-y-3 border-b border-ds-border-subtle p-3">
                <div className="relative"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ds-text-secondary" /><Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, número ou endereço..." className="pl-10" aria-label="Pesquisar OS" /></div>
                <div className="flex flex-wrap gap-1.5">{filters.map((f) => <button key={f.key} type="button" onClick={() => setOnly(f.key)} aria-pressed={only === f.key} className={`rounded-full border px-3 py-1 text-xs font-semibold ${only === f.key ? "border-ds-primary-deep bg-ds-primary-deep text-white" : "border-ds-border text-ds-text-muted hover:border-ds-primary"}`}>{f.label}</button>)}</div>
              </div>
              <ul className="flex-1 divide-y divide-ds-border-subtle overflow-y-auto">
                {points.map((p) => (
                  <li key={p.id}>
                    <div className={`flex gap-2 px-3 py-2.5 text-sm ${selected?.id === p.id ? "bg-ds-primary/10" : "hover:bg-ds-bg"}`}>
                      <button type="button" onClick={() => setSelected(p)} className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-2"><span className="font-semibold text-ds-primary">{formatOsNumber(p.number)}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${OS_STATUS[p.status]?.className ?? ""}`}>{OS_STATUS[p.status]?.label}</span></span>
                        <span className="block truncate font-medium text-ds-text">{p.personName}</span>
                        <span className="block truncate text-xs text-ds-text-secondary">{addressLine(p.address) || "Sem endereço"}</span>
                        <span className="block text-xs text-ds-text-secondary">{p.technicians.join(", ") || "Sem técnico"} · prev. {fmtDate(p.scheduleEnd)}</span>
                      </button>
                      <button type="button" onClick={() => setOpenId(p.id)} aria-label={`Abrir OS ${formatOsNumber(p.number)}`} className="self-center rounded-md border border-ds-primary-deep p-1 text-ds-primary-deep hover:bg-ds-primary-deep hover:text-white"><Icon name="open_in_new" className="text-[16px]" /></button>
                    </div>
                  </li>
                ))}
                {points.length === 0 && <li className="px-3 py-10 text-center text-sm text-ds-text-secondary">Nenhuma OS encontrada.</li>}
              </ul>
              <p className="border-t border-ds-border-subtle px-3 py-2 text-xs text-ds-text-secondary">{points.length} de {data.points.length} OS · {points.filter((p) => p.lat !== null).length} com localização</p>
            </section>
            <section className="min-h-[24rem] overflow-hidden rounded-xl border border-ds-border-subtle bg-white">
              <iframe title="Mapa das ordens de serviço" src={mapSrc(points, selected)} className="h-full min-h-[24rem] w-full border-0" loading="lazy" />
            </section>
          </div>
        </>
      )}
      {openId && <OsDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => {}} onEdit={() => setOpenId(null)} />}
    </div>
  );
}

export default function OperationsCenterPage() {
  return <PageShell permissionKey={OPERACIONAL_KEYS.central}>{() => <Central />}</PageShell>;
}
