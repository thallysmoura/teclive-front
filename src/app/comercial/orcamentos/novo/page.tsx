"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COMERCIAL_KEYS, quotesClient, sellersClient } from "@/lib/comercial";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { ClientPicker } from "@/components/comercial/client-picker";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";

const selectClass = "h-11 w-full rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text outline-none focus:border-ds-primary focus:ring-2 focus:ring-ds-primary/20";
const inSevenDays = () => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

export default function NewQuotePage() {
  const router = useRouter();
  const [client, setClient] = useState<{ id: string; name: string; sellerName?: string | null } | null>(null);
  const [validUntil, setValidUntil] = useState(inSevenDays);
  const [title, setTitle] = useState("");
  const [seller, setSeller] = useState("");
  const [sellers, setSellers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { sellersClient.list().then((r) => setSellers(r.map((s) => s.name))).catch(() => {}); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return setError("Selecione o cliente.");
    if (!validUntil) return setError("Informe a validade do orçamento.");
    setSaving(true); setError("");
    try {
      const quote = await quotesClient.create({ personId: client.id, validUntil, title, sellerName: seller });
      router.push(`/comercial/orcamentos/${quote.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível criar o orçamento."); setSaving(false); }
  }

  return (
    <PageShell permissionKey={COMERCIAL_KEYS.orcamentos}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Orçamentos", href: "/comercial/orcamentos" }, { label: "Novo Orçamento" }]} />
          <h1 className="mb-4 text-xl font-bold text-ds-primary-deep">Novo Orçamento</h1>
          <form onSubmit={submit} noValidate className="rounded-xl border border-ds-border-subtle bg-white p-5">
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold text-ds-primary-deep">Dados Básicos</h2>
                <div className="grid gap-4 md:grid-cols-[1fr_200px]">
                  <label className="flex flex-col gap-1.5"><FieldLabel>Cliente <span className="text-ds-danger">*</span></FieldLabel>
                    <ClientPicker value={client} onChange={(c) => { setClient(c); setError(""); if (c?.sellerName && !seller) setSeller(c.sellerName); }} />
                  </label>
                  <label className="flex flex-col gap-1.5"><FieldLabel>Validade do Orçamento <span className="text-ds-danger">*</span></FieldLabel><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></label>
                </div>
                <div className="rounded-lg border border-ds-border-subtle">
                  <div className="flex items-center justify-between border-b border-ds-border-subtle bg-ds-bg px-4 py-2 text-xs font-semibold text-ds-text-muted"><span>Contato</span></div>
                  <p className="px-4 py-5 text-center text-sm text-ds-text-secondary">{client ? "Será usado o contato principal do cliente." : "Nenhum contato selecionado."}</p>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold text-ds-primary-deep">Dados Adicionais</h2>
                <label className="flex flex-col gap-1.5"><FieldLabel>Título</FieldLabel><Input value={title} maxLength={200} placeholder="Insira um título" onChange={(e) => setTitle(e.target.value)} /></label>
                <label className="flex flex-col gap-1.5"><FieldLabel>Vendedor</FieldLabel>
                  <select value={seller} onChange={(e) => setSeller(e.target.value)} className={selectClass}><option value="">Selecione...</option>{sellers.map((s) => <option key={s}>{s}</option>)}</select>
                </label>
              </div>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-ds-danger-text">{error}</p>}
            <div className="mt-6 flex flex-wrap gap-3 border-t border-ds-border-subtle pt-5">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar Orçamento"}</Button>
              <Link href="/comercial/orcamentos" className="inline-flex h-11 items-center rounded-[10px] border border-ds-border px-5 text-sm font-bold text-ds-primary-deep hover:border-ds-primary hover:text-ds-primary">Cancelar</Link>
            </div>
          </form>
        </>
      )}
    </PageShell>
  );
}
