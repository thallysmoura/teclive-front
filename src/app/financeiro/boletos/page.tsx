"use client";

import { PageShell } from "@/components/layout/page-shell";
import { Manager } from "@/components/financeiro/manager";
import { FIN_KEYS } from "@/lib/financeiro";

const NOTE = "A emissão bancária de boletos ainda não está integrada ao sistema.";
export default function BoletosPage() {
  return <PageShell permissionKey={FIN_KEYS.boletos}>{() => <Manager title="Gerenciador de Boletos" tabs={[
    { label: "Boletos a Gerar", query: { status: "ABERTA", method: "Boleto" }, empty: "Não foi possível encontrar contas com os filtros selecionados.", info: NOTE },
    { label: "Boletos Gerados", empty: "Nenhum boleto gerado.", info: NOTE },
    { label: "Impressão em Carnê", empty: "Nenhum carnê para imprimir.", info: NOTE },
    { label: "Extrato de Recebimentos", query: { status: "LIQUIDADA", method: "Boleto" }, empty: "Nenhum recebimento por boleto." },
  ]} />}</PageShell>;
}
