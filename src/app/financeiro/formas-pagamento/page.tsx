"use client";

import { PageShell } from "@/components/layout/page-shell";
import { SimpleCrud } from "@/components/financeiro/simple-crud";
import { FIN_KEYS, fin, type Method } from "@/lib/financeiro";

export default function MethodsPage() {
  return <PageShell permissionKey={FIN_KEYS.formas}>{() => <SimpleCrud<Method & { [k: string]: unknown }> title="Formas de Pagamento" newLabel="Nova Forma de Pagamento" nameField="description" load={fin.methods} save={fin.saveMethod} />}</PageShell>;
}
