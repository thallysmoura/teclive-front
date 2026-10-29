"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";

function Qr() {
  const [src, setSrc] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const url = `${location.origin}/app-os/instalar`;
    setLink(url);
    void QRCode.toDataURL(url, { width: 360, margin: 2, color: { dark: "#00406A", light: "#FFFFFF" } }).then(setSrc);
  }, []);
  const steps = ["Aponte a câmera do celular para o QR Code.", "Abra o link e toque em “Instalar aplicativo” (no iPhone: Compartilhar → Adicionar à Tela de Início).", "Entre com seu e-mail e senha e permita a localização.", "Pronto: suas ordens de serviço aparecem em Pendentes e Histórico."];
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Aplicativo" }]} />
      <h1 className="mt-3 text-2xl font-bold text-ds-text">Aplicativo Gestão de OS</h1>
      <p className="mt-1 text-sm text-ds-text-muted">Aplicativo PWA para o técnico atender ordens de serviço em campo. Só entram os e-mails marcados em Controle de Acesso → Aplicativo.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr]">
        <section className="flex flex-col items-center rounded-2xl border border-ds-border-subtle bg-ds-surface p-6 shadow-sm">
          {src ? <img src={src} alt="QR Code para instalar o aplicativo" width={260} height={260} className="rounded-xl border border-ds-border-subtle" /> : <div className="h-[260px] w-[260px] animate-pulse rounded-xl bg-ds-bg" />}
          <p className="mt-3 max-w-[260px] break-all text-center text-xs text-ds-text-muted">{link}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => { void navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }} className="inline-flex items-center gap-1.5 rounded-lg border border-ds-border-subtle px-3 py-2 text-sm font-semibold text-ds-primary hover:bg-ds-bg"><Icon name={copied ? "check" : "content_copy"} className="text-[18px]" />{copied ? "Copiado" : "Copiar link"}</button>
            <a href={src} download="qrcode-gestao-os.png" className="inline-flex items-center gap-1.5 rounded-lg bg-ds-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"><Icon name="download" className="text-[18px]" />Baixar</a>
          </div>
        </section>
        <section className="rounded-2xl border border-ds-border-subtle bg-ds-surface p-6 shadow-sm">
          <h2 className="text-base font-bold text-ds-text">Como instalar</h2>
          <ol className="mt-3 space-y-3">
            {steps.map((s, i) => <li key={s} className="flex gap-3 text-sm text-ds-text"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F7941D] text-xs font-bold text-white">{i + 1}</span>{s}</li>)}
          </ol>
        </section>
      </div>
    </main>
  );
}

export default function Page() {
  return <PageShell permissionKey={null}>{(user) => (user.role === "ADMIN" ? <Qr /> : <main className="p-8 text-sm text-ds-text-muted">Disponível apenas para administradores.</main>)}</PageShell>;
}
