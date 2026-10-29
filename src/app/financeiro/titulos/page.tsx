"use client";

import { PageShell } from "@/components/layout/page-shell";
import { Manager } from "@/components/financeiro/manager";
import { FIN_KEYS } from "@/lib/financeiro";

const NOTE = "A remessa e o retorno bancário ainda não estão integrados ao sistema.";
export default function TitlesPage() {
  return <PageShell permissionKey={FIN_KEYS.titulos}>{() => <Manager title="Gerenciador de Títulos de Cobrança" tabs={[
    { label: "Títulos a Gerar", query: { status: "ABERTA", method: "Boleto" }, empty: "Não foi encontrada contas sem títulos para os filtros selecionados.", info: NOTE },
    { label: "Títulos Gerados", empty: "Nenhum título gerado.", info: NOTE },
    { label: "Nova Remessa", empty: "Selecione títulos gerados para compor uma remessa.", info: NOTE },
    { label: "Remessas", empty: "Nenhuma remessa enviada.", info: NOTE },
    { label: "Arquivo de Retorno", empty: "Nenhum arquivo de retorno.", info: NOTE },
    { label: "Importar Retorno", empty: "Envie o arquivo de retorno do banco para baixar os títulos.", info: NOTE },
    { label: "Impressão em Carnê", empty: "Nenhum carnê para imprimir.", info: NOTE },
  ]} />}</PageShell>;
}
