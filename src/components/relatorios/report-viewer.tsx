"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PeopleReport, PeopleReportItem } from "@/lib/relatorios";

/* Visualizador do relatório no padrão do eugestor: barra de ferramentas, páginas A4 com borda cinza, tabelas com borda preta de 1,25 px e Arial. */

const PAGE_H = 1057; // altura útil da página (px, 100%)
const HEADER_H = 130; // cabeçalho da primeira página (filtros + logo + título)
const FOOTER_H = 36; // rodapé reservado
const GAP = 17; // espaço entre cadastros
const BORDER = "1.25px solid #000";
const ARIAL = "Arial, Helvetica, sans-serif";

const ico = (d: string, fill = "#3a5a9a") => <svg width="16" height="16" viewBox="0 0 16 16" fill={fill} aria-hidden="true"><path d={d} /></svg>;
const ICONS = {
  print: "M4 1h8v3H4zM2 5h12a1 1 0 0 1 1 1v5h-3v3H4v-3H1V6a1 1 0 0 1 1-1zm3 5v4h6v-4z",
  save: "M2 1h10l3 3v11H2zM4 2v4h7V2zm1 8h6v4H5z",
  copy: "M5 1h7l2 2v9H5zM2 4h2v9h7v2H2z",
  paste: "M4 2h2V1h4v1h2v13H4zm2 3v8h4V5z",
  find: "M2 4h4v8H2zM10 4h4v8h-4zM6 6h4v3H6zM1 11h3v2H1zM12 11h3v2h-3z",
  first: "M3 2h2v12H3zm10 0v12L6 8z",
  prev: "M11 2v12L4 8z",
  next: "M5 2v12l7-6z",
  last: "M11 2h2v12h-2zM3 2v12l7-6z",
  full: "M1 2h14v12H1zm2 2v8h10V4z",
  zoom: "M6 1a5 5 0 1 0 3 9l4 4 1.5-1.5-4-4A5 5 0 0 0 6 1zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z",
  doc: "M3 1h7l3 3v11H3zM9 2v3h3z",
};

const fmtDateTime = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };

/* ---------- peças do relatório ---------- */

const cell = (w: number | string, extra: React.CSSProperties = {}): React.CSSProperties => ({ width: w, boxSizing: "border-box", borderRight: BORDER, borderBottom: BORDER, overflow: "hidden", display: "flex", alignItems: "center", fontSize: 12, fontFamily: ARIAL, color: "#000", ...extra });

function PersonBlock({ p }: { p: PeopleReportItem }) {
  return (
    <div style={{ width: 689, marginLeft: 15, borderTop: BORDER, borderLeft: BORDER, boxSizing: "border-box", fontFamily: ARIAL }}>
      <div style={{ display: "flex", height: 22, background: "#f2f2f2", borderRight: BORDER, borderBottom: BORDER, boxSizing: "border-box" }}>
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 3, display: "flex", alignItems: "center", fontSize: 14.6667, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden" }}>{p.name}</div>
        <div style={{ width: 191, flexShrink: 0, paddingRight: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden" }}>CPF/CNPJ: {p.document}</div>
      </div>
      <div style={{ display: "flex", height: 22 }}>
        <div style={cell(286, { paddingLeft: 3 })}>RG/Inscrição Estadual: {p.rg}</div>
        <div style={cell(182, { paddingLeft: 4 })}>Telefone: {p.phone}</div>
        <div style={cell(221, { paddingLeft: 4 })}>Inscrição Municipal: {p.municipalRegistration}</div>
      </div>
      <div style={{ display: "flex", minHeight: 22 }}>
        <div style={cell(627, { paddingLeft: 3, paddingTop: 2, paddingBottom: 2, lineHeight: "14px" })}>Endereço: {p.address}</div>
        <div style={cell(62, { justifyContent: "center", fontSize: 10.6667 })}>{p.active ? "ATIVO" : "INATIVO"}</div>
      </div>
      {p.contacts.length === 0 ? (
        <div style={cell(689, { height: 22, justifyContent: "center", fontWeight: 700 })}>Sem contato cadastrado</div>
      ) : (
        <>
          <div style={cell(689, { height: 19, justifyContent: "center", fontWeight: 700 })}>Contatos</div>
          <div style={{ display: "flex", height: 16, fontSize: 10.6667, fontWeight: 700 }}>
            <div style={cell(274, { paddingLeft: 3, fontSize: 10.6667 })}>Contato</div><div style={cell(102, { paddingLeft: 3, fontSize: 10.6667 })}>Telefone</div><div style={cell(196, { paddingLeft: 3, fontSize: 10.6667 })}>Email</div><div style={cell(117, { paddingLeft: 3, fontSize: 10.6667 })}>Tipo</div>
          </div>
          {p.contacts.map((c, i) => (
            <div key={i} style={{ display: "flex", height: 17, fontStyle: "italic" }}>
              <div style={cell(274, { paddingLeft: 3, fontSize: 10.6667, whiteSpace: "nowrap" })}>{c.name}</div><div style={cell(102, { paddingLeft: 3, fontSize: 10.6667, whiteSpace: "nowrap" })}>{c.phone}</div><div style={cell(196, { paddingLeft: 3, fontSize: 10.6667, whiteSpace: "nowrap" })}>{c.email}</div><div style={cell(117, { paddingLeft: 3, fontSize: 10.6667, whiteSpace: "nowrap" })}>{c.type}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ---------- modelo genérico: qualquer relatório vira cabeçalho + blocos medidos e paginados ---------- */

export type ReportBlock = { node: React.ReactNode; gap: number };
type ReportMeta = { title: string; filters: [string, string][]; company: string; generatedBy: string; generatedAt: string };

function ReportHeader({ meta }: { meta: ReportMeta }) {
  return (
    <div style={{ height: HEADER_H, position: "relative", fontFamily: ARIAL, boxSizing: "border-box" }}>
      <div style={{ position: "absolute", left: 15, top: 0, fontSize: 10.6667 }}>
        {meta.filters.slice(0, 5).map(([k, v]) => <div key={k} style={{ display: "flex", height: 15, alignItems: "center" }}><span style={{ width: 106 }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span></div>)}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/teclive-logo.png" alt="" style={{ position: "absolute", left: 513, top: 0, width: 191, height: 83, objectFit: "contain" }} />
      <div style={{ position: "absolute", left: 15, width: 689, top: 83 + 23, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>{meta.title}</div>
    </div>
  );
}

function Page({ meta, blocks, number, total, first }: { meta: ReportMeta; blocks: ReportBlock[]; number: number; total: number; first: boolean }) {
  return (
    <div className="rv-page" data-page={number} style={{ overflow: "hidden", margin: 10, display: "inline-block", textAlign: "left", verticalAlign: "top", padding: 39, border: "1px solid gray", color: "#000", background: "#fff", boxSizing: "content-box", width: 718, height: PAGE_H, position: "relative", boxShadow: "2px 2px 6px rgba(0,0,0,.25)" }}>
      {first && <ReportHeader meta={meta} />}
      {blocks.map((b, i) => <div key={i} style={{ marginBottom: b.gap }}>{b.node}</div>)}
      <div style={{ position: "absolute", left: 39 + 15, right: 39 + 14, bottom: 39 - 6, fontFamily: ARIAL, fontSize: 9.3333, lineHeight: "11px", display: "flex", justifyContent: "space-between" }}>
        <div><div>Gerado para {meta.company}</div><div>Emitido por {meta.generatedBy} em {fmtDateTime(meta.generatedAt)}</div></div>
        <div>Página {number}/{total}</div>
      </div>
    </div>
  );
}

/* ---------- visualizador ---------- */

type Mode = "single" | "continuous" | "multiple";
const MODES: [Mode, string][] = [["single", "Single Page"], ["continuous", "Continuous"], ["multiple", "Multiple Pages"]];
const ZOOMS = [25, 50, 75, 100, 125, 150, 200];

export function ReportViewer({ meta, blocks, exportExcel }: { meta: ReportMeta; blocks: ReportBlock[]; exportExcel: () => void }) {
  const measure = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([]);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [mode, setMode] = useState<Mode>("single");
  const [menu, setMenu] = useState<"print" | "save" | "zoom" | "mode" | null>(null);
  const [printing, setPrinting] = useState(false);
  const [finding, setFinding] = useState(false);
  const [term, setTerm] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  // Quebra em páginas pela altura real de cada bloco (como o relatório original).
  useLayoutEffect(() => {
    const root = measure.current;
    if (!root) return;
    const heights = [...root.children].map((el, i) => (el as HTMLElement).offsetHeight + blocks[i].gap);
    const out: number[][] = [[]];
    let used = 0;
    let cap = PAGE_H - HEADER_H - FOOTER_H;
    heights.forEach((h, i) => {
      if (used + h > cap && out[out.length - 1].length) { out.push([]); used = 0; cap = PAGE_H - FOOTER_H; }
      out[out.length - 1].push(i); used += h;
    });
    setPages(out);
  }, [blocks]);

  const total = pages.length || 1;
  const go = (n: number) => { const v = Math.min(Math.max(1, n), total); setPage(v); if (mode !== "single") scroller.current?.querySelector(`[data-page="${v}"]`)?.scrollIntoView({ block: "start" }); };

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, [printing]);

  const visible = useMemo(() => (printing || mode !== "single" ? pages.map((_, i) => i + 1) : [page]), [printing, mode, pages, page]);

  const btn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, height: 24, padding: "0 6px", border: "1px solid transparent", background: "transparent", font: `11px ${ARIAL}`, color: "#222", cursor: "pointer", borderRadius: 2, whiteSpace: "nowrap" };
  const dis: React.CSSProperties = { ...btn, opacity: 0.35, cursor: "default" };
  const Drop = ({ id, label, icon, items }: { id: "print" | "save" | "zoom" | "mode"; label: string; icon: string; items: { label: string; run: () => void }[] }) => (
    <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button type="button" style={{ ...btn, ...(menu === id ? { background: "#e0e8f8", borderColor: "#9ab" } : null) }} onClick={() => setMenu(menu === id ? null : id)}>{ico(icon)}{label}<span style={{ fontSize: 7, marginLeft: 2 }}>▼</span></button>
      {menu === id && <div style={{ position: "absolute", top: 26, left: 0, zIndex: 20, minWidth: 130, background: "#fff", border: "1px solid #aaa", boxShadow: "2px 2px 6px rgba(0,0,0,.25)" }}>
        {items.map((it) => <button key={it.label} type="button" onClick={() => { setMenu(null); it.run(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 10px", border: 0, background: "#fff", font: `11px ${ARIAL}`, cursor: "pointer" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#e8eefc")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>{it.label}</button>)}
      </div>}
    </div>
  );

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: ARIAL }}>
      <style>{`@media print { .rv-toolbar, .rv-measure { display: none !important; } .rv-scroll { overflow: visible !important; height: auto !important; } .rv-page { margin: 0 !important; border: 0 !important; box-shadow: none !important; page-break-after: always; zoom: 1 !important; } body { background: #fff !important; } @page { size: A4; margin: 0; } }`}</style>

      <div className="rv-toolbar" style={{ position: "sticky", top: 0, zIndex: 10, margin: "6px 6px 0", border: "1px solid #c6c6c6", background: "linear-gradient(#fdfdfd,#eceef2)", padding: "2px 4px", display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", minHeight: 30 }}>
        <Drop id="print" label="Print" icon={ICONS.print} items={[{ label: "Print to PDF", run: () => setPrinting(true) }, { label: "Print with preview", run: () => setPrinting(true) }]} />
        <Drop id="save" label="Save" icon={ICONS.save} items={[{ label: "PDF", run: () => setPrinting(true) }, { label: "Excel", run: exportExcel }]} />
        <button type="button" style={dis} disabled aria-label="Recortar">{ico(ICONS.copy)}</button>
        <button type="button" style={dis} disabled aria-label="Colar">{ico(ICONS.paste)}</button>
        <button type="button" style={dis} disabled aria-label="Copiar">{ico(ICONS.copy)}</button>
        <button type="button" style={btn} aria-label="Localizar" title="Localizar" onClick={() => setFinding((v) => !v)}>{ico(ICONS.find)}</button>
        {finding && <input value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && term) (window as unknown as { find: (s: string) => boolean }).find(term); }} placeholder="Localizar..." style={{ height: 22, width: 130, font: `11px ${ARIAL}`, border: "1px solid #aaa", padding: "0 4px" }} autoFocus />}
        <span style={{ width: 8 }} />
        <button type="button" style={page <= 1 ? dis : btn} disabled={page <= 1} onClick={() => go(1)} aria-label="Primeira página">{ico(ICONS.first)}</button>
        <button type="button" style={page <= 1 ? dis : btn} disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Página anterior">{ico(ICONS.prev)}</button>
        <span style={{ font: `11px ${ARIAL}`, display: "inline-flex", alignItems: "center", gap: 4 }}>Page
          <input value={page} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); if (n) go(n); }} style={{ width: 38, height: 20, textAlign: "center", font: `11px ${ARIAL}`, border: "1px solid #777" }} aria-label="Página" />
          of {total}</span>
        <button type="button" style={page >= total ? dis : btn} disabled={page >= total} onClick={() => go(page + 1)} aria-label="Próxima página">{ico(ICONS.next)}</button>
        <button type="button" style={page >= total ? dis : btn} disabled={page >= total} onClick={() => go(total)} aria-label="Última página">{ico(ICONS.last)}</button>
        <button type="button" style={btn} aria-label="Tela cheia" onClick={() => document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen?.()}>{ico(ICONS.full)}</button>
        <Drop id="zoom" label={`${zoom}%`} icon={ICONS.zoom} items={ZOOMS.map((z) => ({ label: `${z}%`, run: () => setZoom(z) }))} />
        <Drop id="mode" label={MODES.find((m) => m[0] === mode)![1]} icon={ICONS.doc} items={MODES.map(([m, l]) => ({ label: l, run: () => { setMode(m); setPage(1); } }))} />
      </div>

      <div className="rv-scroll" ref={scroller} style={{ padding: 4, textAlign: mode === "multiple" ? "left" : "center", overflow: "auto" }}>
        <div style={{ zoom: zoom / 100, display: mode === "multiple" ? "flex" : "block", flexWrap: "wrap", justifyContent: "center" }}>
          {pages.length === 0 ? <p style={{ padding: 40, font: `14px ${ARIAL}` }}>Gerando relatório...</p> : visible.map((n) => <div key={n} style={{ display: mode === "multiple" ? "inline-block" : "block" }}><Page meta={meta} blocks={pages[n - 1].map((i) => blocks[i])} number={n} total={total} first={n === 1} /></div>)}
        </div>
      </div>

      {/* Medição invisível para quebrar as páginas */}
      <div ref={measure} className="rv-measure" aria-hidden="true" style={{ position: "absolute", visibility: "hidden", left: -9999, top: 0, width: 718 }}>
        {blocks.map((b, i) => <div key={i}>{b.node}</div>)}
      </div>
    </div>
  );
}

const downloadXls = (html: string, name: string) => {
  const url = URL.createObjectURL(new Blob([`<html><head><meta charset="utf-8"></head><body>${html}</body></html>`], { type: "application/vnd.ms-excel" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
};

/* ---------- Relatório de Cadastro de Pessoas ---------- */

export function PeopleReportViewer({ report }: { report: PeopleReport }) {
  const meta: ReportMeta = useMemo(() => ({ title: "Relatório de Cadastro de Pessoas", company: report.company, generatedBy: report.generatedBy, generatedAt: report.generatedAt, filters: [["Tipo de Pessoa:", report.filters.personType], ["Tipo de Contribuinte:", report.filters.taxpayer], ["Tipo de Cadastro:", report.filters.registerType], ["Status do Cadastro:", report.filters.status]] }), [report]);
  const blocks = useMemo<ReportBlock[]>(() => report.items.map((p) => ({ node: <PersonBlock p={p} />, gap: GAP })), [report]);
  const exportExcel = () => {
    const rows = report.items.map((p) => `<tr><td>${p.name}</td><td>${p.document}</td><td>${p.rg}</td><td>${p.phone}</td><td>${p.municipalRegistration}</td><td>${p.address}</td><td>${p.active ? "ATIVO" : "INATIVO"}</td><td>${p.contacts.map((c) => [c.name, c.phone, c.email, c.type].filter(Boolean).join(" / ")).join("; ")}</td></tr>`).join("");
    downloadXls(`<table border="1"><tr><th>Nome</th><th>CPF/CNPJ</th><th>RG/Inscrição Estadual</th><th>Telefone</th><th>Inscrição Municipal</th><th>Endereço</th><th>Status</th><th>Contatos</th></tr>${rows}</table>`, "Relatorio de Cadastro de Pessoas.xls");
  };
  return <ReportViewer meta={meta} blocks={blocks} exportExcel={exportExcel} />;
}

/* ---------- Relatórios de dados estratégicos (seções com resumo e tabelas) ---------- */

export type StrategicSection = { title: string; summary?: [string, string][]; columns?: { label: string; width: number; align?: "left" | "right" | "center" }[]; rows?: string[][]; note?: string };
export type StrategicReport = ReportMeta & { sections: StrategicSection[] };

function sectionBlocks(sections: StrategicSection[]): ReportBlock[] {
  const out: ReportBlock[] = [];
  const box = (w: number | string, extra: React.CSSProperties = {}): React.CSSProperties => ({ width: w, boxSizing: "border-box", borderRight: BORDER, borderBottom: BORDER, overflow: "hidden", display: "flex", alignItems: "center", fontSize: 12, fontFamily: ARIAL, color: "#000", padding: "0 4px", ...extra });
  for (const s of sections) {
    out.push({ gap: 0, node: <div style={{ width: 689, marginLeft: 15, boxSizing: "border-box", borderTop: BORDER, borderLeft: BORDER, borderRight: BORDER, borderBottom: BORDER, background: "#f2f2f2", height: 23, paddingLeft: 3, display: "flex", alignItems: "center", fontFamily: ARIAL, fontSize: 14.6667, fontWeight: 700 }}>{s.title}</div> });
    if (s.summary?.length) {
      // Resumo em duas colunas de rótulo/valor
      const pairs: [string, string][][] = [];
      for (let i = 0; i < s.summary.length; i += 2) pairs.push(s.summary.slice(i, i + 2));
      pairs.forEach((row, i) => out.push({ gap: 0, node: <div style={{ display: "flex", width: 689, marginLeft: 15, borderLeft: BORDER, height: 22 }}>{[0, 1].map((k) => <div key={k} style={{ display: "flex", width: 344.5, boxSizing: "border-box", borderRight: BORDER, borderBottom: BORDER }}>{row[k] ? <><div style={box(200, { border: 0, flexShrink: 0 })}>{row[k][0]}</div><div style={box(144, { border: 0, fontWeight: 700, justifyContent: "flex-end" })}>{row[k][1]}</div></> : null}</div>)}</div> }));
    }
    if (s.columns && s.rows) {
      const cols = s.columns;
      out.push({ gap: 0, node: <div style={{ display: "flex", width: 689, marginLeft: 15, borderLeft: BORDER, minHeight: 20 }}>{cols.map((c, i) => <div key={i} style={box(c.width, { fontSize: 10.6667, fontWeight: 700, background: "#f2f2f2", justifyContent: c.align === "right" ? "flex-end" : c.align === "center" ? "center" : "flex-start" })}>{c.label}</div>)}</div> });
      s.rows.forEach((r) => out.push({ gap: 0, node: <div style={{ display: "flex", width: 689, marginLeft: 15, borderLeft: BORDER, minHeight: 19 }}>{cols.map((c, i) => <div key={i} style={box(c.width, { fontSize: 10.6667, paddingTop: 2, paddingBottom: 2, lineHeight: "13px", justifyContent: c.align === "right" ? "flex-end" : c.align === "center" ? "center" : "flex-start" })}>{r[i] ?? ""}</div>)}</div> }));
    }
    if (s.note) out.push({ gap: 0, node: <div style={{ width: 689, marginLeft: 15, padding: "4px 3px", fontFamily: ARIAL, fontSize: 10.6667, fontStyle: "italic" }}>{s.note}</div> });
    out.push({ gap: GAP - 1, node: <div style={{ height: 1 }} /> });
  }
  return out;
}

export function StrategicReportViewer({ report }: { report: StrategicReport }) {
  const blocks = useMemo(() => sectionBlocks(report.sections), [report]);
  const exportExcel = () => {
    const html = report.sections.map((s) => `<table border="1"><tr><th colspan="${Math.max(2, s.columns?.length ?? 2)}">${s.title}</th></tr>${(s.summary ?? []).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}${s.columns ? `<tr>${s.columns.map((c) => `<th>${c.label}</th>`).join("")}</tr>${(s.rows ?? []).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}` : ""}</table><br>`).join("");
    downloadXls(html, `${report.title}.xls`);
  };
  return <ReportViewer meta={report} blocks={blocks} exportExcel={exportExcel} />;
}
