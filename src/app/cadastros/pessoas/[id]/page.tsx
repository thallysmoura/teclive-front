"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CADASTROS_KEYS, peopleClient, type Person } from "@/lib/cadastros";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { PersonForm } from "@/components/cadastros/person-form";
import { PersonSummary } from "@/components/cadastros/insights";

export default function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<Person | null | undefined>(undefined);
  useEffect(() => { peopleClient.get(id).then(setItem).catch(() => setItem(null)); }, [id]);
  return (
    <PageShell permissionKey={CADASTROS_KEYS.pessoas}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Cadastros" }, { label: "Pessoas", href: "/cadastros/pessoas" }, { label: "Editando Pessoa" }]} />
          <h1 className="mb-4 text-xl font-bold text-ds-primary-deep">Editando Pessoa</h1>
          {item === null ? <p className="text-sm text-ds-text-secondary">Pessoa não encontrada.</p> : item && (
            <>
              <PersonSummary person={item} />
              <PersonForm initial={item} submitLabel="Salvar Alteração" onSubmit={async (input) => { await peopleClient.update(id, input); router.push("/cadastros/pessoas"); }} />
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
