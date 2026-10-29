"use client";

import { useEffect, useState } from "react";
import { Breadcrumb } from "@/components/layout/page-shell";
import { Empty, card } from "@/components/contratos/admin-ui";
import { Icon } from "@/components/ui/icon";
import { money } from "@/lib/cadastros";
import { dateBr, fin, type FinAccount } from "@/lib/financeiro";

export type ManagerTab = { label: string; query?: { status: string; method?: string }; empty: string; info?: string };

/** Gerenciadores (boletos, cartões, títulos): listam contas a receber por forma de pagamento; a parte bancária fica como aviso até haver integração. */
export function Manager({ title, tabs }: { title: string; tabs: ManagerTab[] }) {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState<FinAccount[] | null>(null);
  const t = tabs[tab];
  useEffect(() => {
    setRows(null);
    if (!t.query) return;
    void fin.accounts({ kind: "R", status: t.query.status, method: t.query.method, page: 1 }).then((d) => setRows(d.lista)).catch(() => setRows([]));
  }, [t]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: title }]} />
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-ds-primary-deep">{title}</h1>
      <nav role="tablist" className="flex flex-wrap gap-1">{tabs.map((x, i) => <button key={x.label} role="tab" aria-selected={tab === i} type="button" onClick={() => setTab(i)} className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold ${tab === i ? "border-ds-border-subtle border-t-[3px] border-t-[#F7941D] bg-white text-ds-primary-deep" : "border-transparent text-ds-text-muted hover:text-ds-primary"}`}>{x.label}</button>)}</nav>
      <div className={`${card} rounded-tl-none`}>
        {t.query ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-ds-border-subtle text-xs text-ds-text-secondary"><tr><th className="px-4 py-3 font-bold">Vencimento</th><th className="px-3 py-3 font-bold">Descrição</th><th className="px-3 py-3 font-bold">Forma</th><th className="px-4 py-3 text-right font-bold">Valor</th></tr></thead>
            <tbody>{!rows || rows.length === 0 ? <Empty cols={4} loading={!rows} text={t.empty} /> : rows.map((a) => <tr key={a.id} className="border-t border-ds-border-subtle"><td className="px-4 py-3 text-ds-text-muted">{dateBr(a.dueDate)}</td><td className="px-3 py-3"><b className="text-ds-primary-deep">{a.personName}</b><span className="block text-xs text-ds-text-secondary">{a.number} - {a.description}</span></td><td className="px-3 py-3 text-ds-text-muted">{a.paymentMethod}</td><td className="px-4 py-3 text-right font-semibold">{money(a.value)}</td></tr>)}</tbody></table></div>
        ) : <div className="px-6 py-14 text-center"><Icon name="inbox" className="text-[40px] text-ds-text-secondary" /><p className="mt-2 text-ds-text-secondary">{t.empty}</p></div>}
        {t.info && <p className="border-t border-ds-border-subtle px-4 py-3 text-xs text-ds-text-secondary">{t.info}</p>}
      </div>
    </div>
  );
}
