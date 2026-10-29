"use client";

import { PageShell } from "@/components/layout/page-shell";
import { SimpleCrud } from "@/components/financeiro/simple-crud";
import { FIN_KEYS, fin, type Center } from "@/lib/financeiro";

export default function CentersPage() {
  return <PageShell permissionKey={FIN_KEYS.centros}>{() => <SimpleCrud<Center & { [k: string]: unknown }> title="Centro de Resultados" newLabel="Novo Centro de Resultados" nameField="name" load={fin.centers} save={fin.saveCenter} />}</PageShell>;
}
