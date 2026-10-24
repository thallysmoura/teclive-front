"use client";

import { useRouter } from "next/navigation";
import { CADASTROS_KEYS, peopleClient } from "@/lib/cadastros";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { PersonForm } from "@/components/cadastros/person-form";

export default function NewPersonPage() {
  const router = useRouter();
  return (
    <PageShell permissionKey={CADASTROS_KEYS.pessoas}>
      {() => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Cadastros" }, { label: "Pessoas", href: "/cadastros/pessoas" }, { label: "Nova Pessoa" }]} />
          <h1 className="mb-4 text-xl font-bold text-ds-primary-deep">Nova Pessoa</h1>
          <PersonForm submitLabel="Salvar Pessoa" onSubmit={async (input) => { await peopleClient.create(input); router.push("/cadastros/pessoas"); }} />
        </>
      )}
    </PageShell>
  );
}
