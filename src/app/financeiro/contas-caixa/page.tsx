"use client";

import { PageShell } from "@/components/layout/page-shell";
import { SimpleCrud } from "@/components/financeiro/simple-crud";
import { money } from "@/lib/cadastros";
import { FIN_KEYS, fin, type CashAccount } from "@/lib/financeiro";

export default function CashAccountsPage() {
  return (
    <PageShell permissionKey={FIN_KEYS.caixas}>
      {() => <SimpleCrud<CashAccount & { [k: string]: unknown }> title="Contas de Caixa" newLabel="Nova Conta de Caixa" nameField="name" load={fin.cashAccounts} save={fin.saveCash}
        extraField={{ key: "type", label: "Tipo da conta", options: ["Conta Corrente", "Conta Comum", "Poupança", "Aplicação"], initial: "Conta Corrente" }}
        extraCols={[{ head: "Tipo da Conta", cell: (r) => r.type }, { head: "Saldo", cell: (r) => money(r.balance) }]} />}
    </PageShell>
  );
}
