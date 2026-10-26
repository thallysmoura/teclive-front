"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StrategicReportViewer, type StrategicReport } from "@/components/relatorios/report-viewer";
import { AI_REPORT_KEY } from "@/components/relatorios/ai-report-modal";

export default function AiReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<StrategicReport | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(AI_REPORT_KEY);
      if (raw) { setReport(JSON.parse(raw)); return; }
    } catch { /* cai no redirecionamento */ }
    router.replace("/relatorios");
  }, [router]);

  if (!report) return <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "Arial", color: "#444" }}>Carregando relatório...</div>;
  return <StrategicReportViewer report={report} />;
}
