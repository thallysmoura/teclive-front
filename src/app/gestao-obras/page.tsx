"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** A Gestão de Obras agora é uma aba da Visão Geral; endereços antigos (e filtros como ?grupo=atraso) seguem funcionando. */
export default function WorksManagementRedirect() {
  const router = useRouter();
  useEffect(() => {
    const rest = window.location.search.slice(1);
    router.replace(`/home?tab=obras${rest ? `&${rest}` : ""}`);
  }, [router]);
  return null;
}
