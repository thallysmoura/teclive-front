"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PeopleReportViewer } from "@/components/relatorios/people-report-viewer";
import { getPeopleReport, type PeopleReport } from "@/lib/relatorios";

export default function PeopleReportViewPage() {
  const router = useRouter();
  const [report, setReport] = useState<PeopleReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const personType = p.get("personType");
    getPeopleReport({ personType: personType === "F" || personType === "J" ? personType : "T", taxpayer: p.get("taxpayer") ?? "", registerType: p.get("registerType") ?? "", inactive: p.get("inactive") === "true" })
      .then(setReport)
      .catch((e) => { const msg = e instanceof Error ? e.message : "Não foi possível gerar o relatório."; setError(msg); if (/401|sess/i.test(msg)) router.replace("/login"); });
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
  return <PeopleReportViewer report={report} />;
}
