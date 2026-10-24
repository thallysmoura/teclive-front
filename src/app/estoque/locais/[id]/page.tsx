"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStockLocation, type StockLocation } from "@/lib/api";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { LocationActionsModal, useLocationActions } from "@/components/stock/location-actions";

const KEY = "item_b2681b6f-1f50-4d5b-b28a-98b27905e6ad";

export default function StockLocationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [location, setLocation] = useState<StockLocation | null | undefined>(undefined);
  const load = () => getStockLocation(id).then(setLocation).catch(() => setLocation(null));
  useEffect(() => { getStockLocation(id).then(setLocation).catch(() => setLocation(null)); }, [id]);
  const actions = useLocationActions({ onChanged: load, onDeleted: () => router.push("/estoque/locais") });

  return (
    <PageShell permissionKey={KEY}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Locais de Estoque", href: "/estoque/locais" }, { label: "Detalhes do local de estoque" }]} />
          {location === null ? <p className="text-sm text-ds-text-secondary">Local de estoque não encontrado.</p> : location && (
            <section className="rounded-xl border border-ds-border-subtle bg-white p-5">
              <h1 className="text-base font-semibold text-ds-primary-deep">Local de Estoque</h1>
              <p className="mb-4 border-b border-ds-border-subtle pb-3 text-xs text-ds-text-secondary">Usado para registrar os locais de armazenamento de produtos.</p>
              {actions.error && <p role="alert" className="mb-3 rounded-lg bg-ds-danger-bg px-3 py-2 text-sm text-ds-danger-text">{actions.error}</p>}
              <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
                <div className="divide-y divide-ds-border-subtle border-y border-ds-border-subtle text-sm">
                  <Link href={`/estoque/locais/${id}/descricao`} className="flex items-center justify-between gap-4 px-2 py-3 hover:bg-ds-bg">
                    <span className="w-40 shrink-0 text-ds-text-muted">Descrição</span><span className="flex-1 font-medium text-ds-text">{location.description}</span><Icon name="chevron_right" className="text-ds-text-secondary" />
                  </Link>
                  <div className="flex items-center justify-between gap-4 px-2 py-3">
                    <span className="w-40 shrink-0 text-ds-text-muted">Replicação</span><span className="flex-1 font-medium text-ds-text">Não replicado em outras empresas</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-2 py-3">
                    <span className="w-40 shrink-0 text-ds-text-muted">Status</span>
                    <span className="flex-1">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${location.isActive ? "bg-ds-success/10 text-ds-success" : "bg-ds-border-subtle text-ds-text-secondary"}`}>{location.isActive ? "Ativo" : "Inativo"}</span>
                      {location.isPrincipal && <span className="ml-2 rounded-full bg-ds-primary-deep px-2.5 py-1 text-xs font-bold text-white">★ Estoque Principal</span>}
                    </span>
                  </div>
                </div>
                <aside className="self-start rounded-lg border border-ds-border-subtle text-sm">
                  <h2 className="border-b border-ds-border-subtle bg-ds-bg px-4 py-2 text-xs font-semibold text-ds-text-muted">Ações</h2>
                  <ul>
                    {!location.isPrincipal && location.isActive && <li><button type="button" onClick={() => actions.run(location, "principal")} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-ds-primary-deep hover:bg-ds-bg"><Icon name="star" className="text-[16px]" />Definir como principal</button></li>}
                    {!location.isPrincipal && <li><button type="button" onClick={() => actions.run(location, location.isActive ? "inactivate" : "activate")} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-ds-danger-text hover:bg-ds-bg"><Icon name={location.isActive ? "block" : "check_circle"} className="text-[16px]" />{location.isActive ? "Inativar" : "Ativar"}</button></li>}
                    {!location.isPrincipal && <li><button type="button" onClick={() => actions.run(location, "delete")} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-ds-danger-text hover:bg-ds-bg"><Icon name="delete" className="text-[16px]" />Excluir</button></li>}
                    {location.isPrincipal && <li className="px-4 py-3 text-xs text-ds-text-secondary">O estoque principal não pode ser inativado nem excluído.</li>}
                  </ul>
                </aside>
              </div>
              <Link href="/estoque/locais" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-ds-primary-deep px-3 py-1.5 text-sm font-semibold text-ds-primary-deep hover:bg-ds-bg"><Icon name="arrow_back" className="text-[16px]" />Voltar à listagem</Link>
            </section>
          )}
          <LocationActionsModal controller={actions} />
        </>
      )}
    </PageShell>
  );
}
