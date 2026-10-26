"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { CONTRATOS_KEY, contractsApi, fmtDoc, months, type Lookups } from "@/lib/contratos";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const field = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20 disabled:bg-ds-bg disabled:text-ds-text-secondary";
const label = "mb-1 block text-xs font-bold text-ds-text-secondary";

function PersonPicker({ value, onPick }: { value: { id: string; name: string } | null; onPick: (p: { id: string; name: string; document: string | null; type: string } | null) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<{ id: string; name: string; document: string | null; type: string }[]>([]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void contractsApi.searchPeople(q).then((r) => setList(r.lista.slice(0, 12))).catch(() => setList([])), 250);
    return () => clearTimeout(t);
  }, [q, open]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={`${field} flex items-center justify-between text-left`}><span className={value ? "truncate" : "text-ds-text-secondary"}>{value?.name ?? "Selecione..."}</span><Icon name="arrow_drop_down" className="text-[20px] text-ds-text-secondary" /></button>
      {open && (
        <div className="absolute left-0 right-0 top-12 z-30 rounded-xl border border-ds-border-subtle bg-white p-2 shadow-xl">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente por nome ou CPF/CNPJ" className="mb-2 h-10 w-full rounded-lg border border-ds-border px-3 text-sm outline-none focus:border-ds-primary" />
          <ul className="max-h-60 overflow-y-auto">
            {list.length === 0 && <li className="px-3 py-3 text-sm text-ds-text-secondary">Nenhum cliente encontrado.</li>}
            {list.map((p) => <li key={p.id}><button type="button" onClick={() => { onPick(p); setOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-ds-bg"><span className="block font-semibold text-ds-primary-deep">{p.name}</span><span className="block text-xs text-ds-text-secondary">{fmtDoc(p.document, p.type)}</span></button></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function NewContract() {
  const router = useRouter();
  const today = new Date();
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [person, setPerson] = useState<{ id: string; name: string } | null>(null);
  const [day, setDay] = useState("");
  const [method, setMethod] = useState("");
  const [group, setGroup] = useState("");
  const [seller, setSeller] = useState("");
  const [custom, setCustom] = useState(false);
  const [number, setNumber] = useState("");
  const [start, setStart] = useState(iso(today));
  const [end, setEnd] = useState<string | null>(iso(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())));
  const [saving, setSaving] = useState<"" | "save" | "invoice">("");
  const [error, setError] = useState("");

  useEffect(() => { contractsApi.lookups().then((l) => { setLookups(l); setGroup(l.billingGroups[0]?.id ?? ""); }).catch(() => setError("Não foi possível carregar as opções.")); }, []);

  const duration = months(start, end);

  async function save(next: "list" | "invoice") {
    if (saving) return;
    setError("");
    if (!person) return setError("Selecione o cliente.");
    if (!day || Number(day) < 1 || Number(day) > 31) return setError("Informe o dia de vencimento (de 1 a 31).");
    if (!method) return setError("Selecione a forma de pagamento.");
    if (!group) return setError("Selecione o grupo de faturamento.");
    setSaving(next === "invoice" ? "invoice" : "save");
    try {
      const r = await contractsApi.create({ personId: person.id, billingDay: Number(day), paymentMethodId: method, billingGroupId: group, sellerName: seller || null, number: custom ? number : undefined, startDate: start, endDate: end });
      router.push(next === "invoice" ? `/contratos/${r.id}?aba=faturas&novaFatura=1` : `/contratos/${r.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); setSaving(""); }
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Contratos", href: "/contratos" }, { label: "Novo Contrato" }]} />
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-ds-primary-deep">Novo Contrato</h1>
      <div className="rounded-2xl border border-ds-border-subtle bg-white p-5 shadow-sm md:p-7">
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[2fr_1fr]">
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-ds-primary-deep">Dados Básicos</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3"><span className={label}>Cliente *</span><PersonPicker value={person} onPick={(p) => setPerson(p ? { id: p.id, name: p.name } : null)} /></div>
              <label><span className={label}>Dia de Vencimento *</span><input type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} placeholder="Informe..." className={field} /></label>
              <label><span className={label}>Forma de Pagamento *</span><select value={method} onChange={(e) => setMethod(e.target.value)} className={field}><option value="">Selecione...</option>{lookups?.paymentMethods.map((m) => <option key={m.id} value={m.id}>{m.description}</option>)}</select></label>
              <label><span className={label}>Grupo de Faturamento *</span><select value={group} onChange={(e) => setGroup(e.target.value)} className={field}><option value="">Selecione...</option>{lookups?.billingGroups.map((g) => <option key={g.id} value={g.id}>{g.description}</option>)}</select></label>
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-ds-primary-deep">Dados Adicionais</h2>
            <div className="grid gap-4">
              <div><span className={label}>Número do Contrato</span><div className="flex gap-2"><input value={custom ? number : ""} onChange={(e) => setNumber(e.target.value)} disabled={!custom} placeholder="Gerado automaticamente" className={field} /><button type="button" onClick={() => setCustom((v) => !v)} className="h-11 shrink-0 rounded-[10px] border border-ds-border px-3 text-sm font-semibold text-ds-primary-deep hover:border-ds-primary">{custom ? "Automático" : "Personalizar"}</button></div></div>
              <label><span className={label}>Vendedor</span><select value={seller} onChange={(e) => setSeller(e.target.value)} className={field}><option value="">Selecione...</option>{lookups?.sellers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select></label>
            </div>
          </section>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-extrabold text-ds-primary-deep">Período de Vigência</h2>
          <div className="grid items-end gap-4 sm:grid-cols-[200px_200px_200px]">
            <label><span className={label}>Início da Vigência *</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={field} /></label>
            <div>
              <div className="mb-1 flex items-center justify-between"><span className="text-xs font-bold text-ds-text-secondary">Fim da Vigência *</span><button type="button" onClick={() => setEnd(end ? null : iso(new Date(new Date(start).getFullYear() + 1, new Date(start).getMonth(), new Date(start).getDate() + 1)))} className="text-[11px] font-semibold text-ds-primary hover:underline">{end ? "Mudar para indeterminado" : "Definir data"}</button></div>
              <input type="date" value={end ?? ""} onChange={(e) => setEnd(e.target.value || null)} disabled={!end} placeholder="Indeterminado" className={field} />
            </div>
            <div className="flex h-11 items-center gap-3 rounded-[10px] border border-ds-border bg-ds-bg/60 px-3"><Icon name="schedule" className="text-[22px] text-ds-text-secondary" /><span className="leading-tight"><span className="block text-[11px] text-ds-text-secondary">Duração</span><span className="block text-sm font-bold text-[#12A262]">{duration === null ? "Indeterminado" : `${duration} ${duration === 1 ? "Mês" : "Meses"}`}</span></span></div>
          </div>
        </section>

        {error && <p role="alert" className="mt-5 text-sm font-medium text-ds-danger-text">{error}</p>}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-ds-border-subtle pt-5">
          <button type="button" onClick={() => void save("list")} disabled={!!saving} className="inline-flex h-11 items-center rounded-[10px] bg-[#F7941D] px-6 text-sm font-bold text-white hover:bg-[#E5850F] disabled:opacity-60">{saving === "save" ? "Salvando..." : "Salvar Contrato"}</button>
          <button type="button" onClick={() => void save("invoice")} disabled={!!saving} className="inline-flex h-11 items-center rounded-[10px] border border-[#F7941D] px-5 text-sm font-bold text-[#E5850F] hover:bg-[#F7941D]/10 disabled:opacity-60">{saving === "invoice" ? "Salvando..." : "Salvar e Adicionar Fatura"}</button>
          <Link href="/contratos" className="inline-flex h-11 items-center rounded-[10px] border border-ds-border px-5 text-sm font-semibold text-ds-text-muted hover:border-ds-primary">Cancelar</Link>
        </div>
      </div>
    </div>
  );
}

export default function NewContractPage() {
  return <PageShell permissionKey={CONTRATOS_KEY}>{() => <NewContract />}</PageShell>;
}
