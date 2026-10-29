"use client";

import { PageShell } from "@/components/layout/page-shell";
import { Manager } from "@/components/financeiro/manager";
import { FIN_KEYS } from "@/lib/financeiro";

export default function CardsPage() {
  return <PageShell permissionKey={FIN_KEYS.cartoes}>{() => <Manager title="Gerenciador de Cartões de Crédito" tabs={[
    { label: "Transações Pendentes", query: { status: "ABERTA", method: "Cartão" }, empty: "Nenhuma conta encontrada para os filtros informados.", info: "A captura de cartão ainda não está integrada ao sistema." },
    { label: "Transações Realizadas", query: { status: "LIQUIDADA", method: "Cartão" }, empty: "Nenhuma transação realizada." },
    { label: "Cartões de Crédito", empty: "Nenhum cartão cadastrado." },
    { label: "Extrato de Recebimentos", query: { status: "LIQUIDADA", method: "Cartão" }, empty: "Nenhum recebimento por cartão." },
  ]} />}</PageShell>;
}
