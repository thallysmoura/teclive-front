"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Como no eugestor, as Configurações abrem em "Meus Dados". */
export default function SettingsIndexPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/meus-dados"); }, [router]);
  return null;
}
