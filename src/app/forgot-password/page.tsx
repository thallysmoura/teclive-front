"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { checkEmail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { CopyrightFooter } from "@/components/ui/copyright-footer";
import { Modal } from "@/components/ui/modal";
import { OtpInput } from "@/components/ui/otp-input";

type Feedback = { type: "success" | "error"; message: string } | null;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [otpKey, setOtpKey] = useState(0);

  useEffect(() => {
    if (!otpSent || resendSeconds <= 0) return;
    const timer = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [otpSent, resendSeconds]);

  function handleResend() {
    setOtpCode(null);
    setOtpKey((k) => k + 1);
    setResendSeconds(60);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const exists = await checkEmail(email);
      if (exists) {
        setFeedback({
          type: "success",
          message: "Enviamos um código de verificação para o e-mail informado.",
        });
        // Reenvia um novo código apenas na primeira vez; reabrir a modal não reinicia a contagem.
        if (!otpSent) {
          setOtpCode(null);
          setResendSeconds(60);
          setOtpKey((k) => k + 1);
          setOtpSent(true);
        }
        setOtpOpen(true);
      } else {
        setFeedback({ type: "error", message: "Não encontramos uma conta com esse e-mail." });
      }
    } catch {
      setFeedback({ type: "error", message: "Não foi possível verificar o e-mail. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-white via-[#328AC6] to-[#144567]">
      <div className="pointer-events-none absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-[360px] w-[360px] rounded-full bg-[#144567]/40 blur-3xl" />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 w-48 sm:w-56 md:w-64">
          <Image src="/teclive-logo.png" alt="tecLive" width={2172} height={724} priority className="h-auto w-full" />
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-[340px] rounded-xl bg-white p-6 shadow-xl">
          <h1 className="mb-1 text-lg font-bold text-ds-primary-deep">Esqueci minha senha</h1>
          <p className="mb-5 text-sm text-ds-text-secondary">
            Informe o e-mail da sua conta para receber um código de verificação.
          </p>

          <label className="mb-4 flex flex-col gap-1.5" htmlFor="email">
            <FieldLabel>E-mail</FieldLabel>
            <div className="relative">
              <Icon
                name="mail"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ds-text-secondary"
              />
              <Input
                id="email"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFeedback(null);
                  setOtpSent(false);
                }}
                className="pl-10"
                required
              />
            </div>
          </label>

          {feedback && (
            <p
              className={`mb-4 flex items-center gap-1.5 text-sm ${
                feedback.type === "success" ? "text-ds-success" : "text-ds-danger-text"
              }`}
            >
              <Icon name={feedback.type === "success" ? "check_circle" : "error"} className="text-[18px]" />
              {feedback.message}
            </p>
          )}

          <Button type="submit" disabled={loading} className="mb-4 w-full">
            {loading ? "Verificando..." : "Recuperar conta"}
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-1 text-sm font-bold text-ds-primary-deep hover:text-ds-primary"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Voltar ao login
          </Link>
        </form>
      </main>

      <CopyrightFooter />

      <Modal open={otpOpen} onClose={() => setOtpOpen(false)}>
        <h2 className="mb-1 text-lg font-bold text-ds-primary-deep">Código de verificação</h2>
        <p className="mb-5 text-sm text-ds-text-secondary">
          Digite o código de 6 dígitos enviado para <span className="font-semibold">{email}</span>.
        </p>

        <OtpInput key={otpKey} length={6} onComplete={(code) => setOtpCode(code)} />

        {otpCode && (
          <p className="mt-4 text-center text-sm text-ds-text-secondary">
            Código digitado: <span className="font-mono font-bold text-ds-text">{otpCode}</span>
          </p>
        )}

        <button
          type="button"
          onClick={handleResend}
          disabled={resendSeconds > 0}
          className="mt-5 block w-full text-center text-sm font-bold text-ds-primary-deep hover:text-ds-primary disabled:cursor-not-allowed disabled:text-ds-text-secondary disabled:hover:text-ds-text-secondary"
        >
          {resendSeconds > 0
            ? `Reenviar código em 0:${resendSeconds.toString().padStart(2, "0")}`
            : "Reenviar código"}
        </button>

        <button
          type="button"
          onClick={() => setOtpOpen(false)}
          className="mt-6 block w-full text-center text-sm font-bold text-ds-text-muted hover:text-ds-primary"
        >
          Cancelar
        </button>
      </Modal>
    </div>
  );
}
