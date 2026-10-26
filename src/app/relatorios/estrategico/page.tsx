"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StrategicReportViewer, type StrategicReport } from "@/components/relatorios/report-viewer";
import { getStrategicReport } from "@/lib/relatorios";

export default function StrategicReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<StrategicReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const kind = new URLSearchParams(window.location.search).get("kind") ?? "geral";
    getStrategicReport(kind)
      .then(setReport)
      .catch((e) => { const msg = e instanceof Error ? e.message : "Não foi possível gerar o relatório."; setError(msg); if (/sess/i.test(msg)) router.replace("/login"); });
  }, [router]);

  if (error) return <p role="alert" style={{ padding: 40, fontFamily: "Arial" }}>{error}</p>;
  if (!report) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "#fff", fontFamily: "Times New Roman, serif", color: "#444" }}>
        <span className="animate-spin" style={{ width: 58, height: 58, border: "5px solid #d0d8ea", borderTopColor: "#1c4a8e", borderRadius: "50%" }} />
        <span style={{ fontSize: 15 }}>Gerando relatório...</span>
      </div>
    );
  }
  return <StrategicReportViewer report={report} />;
}
