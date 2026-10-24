"use client";

import { useRouter } from "next/navigation";
import { CADASTROS_KEYS, servicesClient } from "@/lib/cadastros";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { ServiceForm } from "@/components/cadastros/service-form";

export default function NewServicePage() {
  const router = useRouter();
  return (
    <PageShell permissionKey={CADASTROS_KEYS.servicos}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Cadastros" }, { label: "Serviços", href: "/cadastros/servicos" }, { label: "Novo Serviço" }]} />
          <h1 className="mb-4 text-xl font-bold text-ds-primary-deep">Novo Serviço</h1>
          <ServiceForm submitLabel="Salvar Serviço" onSubmit={async (input) => { await servicesClient.create(input); router.push("/cadastros/servicos"); }} />
        </>
      )}
    </PageShell>
  );
}
