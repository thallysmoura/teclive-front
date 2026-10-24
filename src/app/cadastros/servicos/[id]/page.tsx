"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CADASTROS_KEYS, servicesClient, type ServiceItem } from "@/lib/cadastros";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { ServiceForm } from "@/components/cadastros/service-form";
import { ServiceSummary } from "@/components/cadastros/insights";

export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<ServiceItem | null | undefined>(undefined);
  useEffect(() => { servicesClient.get(id).then(setItem).catch(() => setItem(null)); }, [id]);
  return (
    <PageShell permissionKey={CADASTROS_KEYS.servicos}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Administrativo" }, { label: "Serviços", href: "/cadastros/servicos" }, { label: "Editando Serviço" }]} />
          <h1 className="mb-4 text-xl font-bold text-ds-primary-deep">Editando Serviço</h1>
          {item === null ? <p className="text-sm text-ds-text-secondary">Serviço não encontrado.</p> : item && (
            <>
              <ServiceSummary service={item} />
              <ServiceForm initial={item} submitLabel="Salvar Alteração" onSubmit={async (input) => { await servicesClient.update(id, input); router.push("/cadastros/servicos"); }} />
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
