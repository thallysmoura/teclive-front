"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Os dados da empresa agora ficam em Configurações › Empresa. */
export default function CompanyRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/configuracoes/dados-da-empresa"); }, [router]);
  return null;
}
