"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { CopyrightFooter } from "@/components/ui/copyright-footer";
import { requestLoginLocation } from "@/lib/login-location";
import { requestLoginNotifications } from "@/lib/login-notifications";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepConnected, setKeepConnected] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready) emailRef.current?.focus();
  }, [ready]);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await requestLoginNotifications();
      setLocating(true);
      const location = await requestLoginLocation();
      setLocating(false);
      await login(email, password, keepConnected, location);
      router.push("/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
      setLocating(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-white via-[#328AC6] to-[#144567]">
      <div className="pointer-events-none absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-[360px] w-[360px] rounded-full bg-[#144567]/40 blur-3xl" />

      {!ready && (
        <div className="absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-500">
          <svg
            className="h-10 w-10 animate-spin text-white"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      )}

      <main
        className={`relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="mb-8 w-48 sm:w-56 md:w-64">
          <Image
            src="/teclive-logo.png"
            alt="tecLive"
            width={2172}
            height={724}
            priority
            className="h-auto w-full"
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[340px] rounded-xl bg-white p-6 shadow-xl"
        >
          <label className="mb-4 flex flex-col gap-1.5" htmlFor="email">
            <FieldLabel>E-mail</FieldLabel>
            <div className="relative">
              <Icon
                name="mail"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ds-text-secondary"
              />
              <Input
                id="email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                error={!!error}
                required
              />
            </div>
          </label>

          <label className="mb-3 flex flex-col gap-1.5" htmlFor="password">
            <FieldLabel>Senha</FieldLabel>
            <div className="relative">
              <Icon
                name="lock"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ds-text-secondary"
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                error={!!error}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-ds-text-secondary hover:text-ds-primary"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                <Icon name={showPassword ? "visibility_off" : "visibility"} />
              </button>
            </div>
            {error && <span className="text-xs text-ds-danger-text">{error}</span>}
          </label>

          <label className="mb-4 flex items-center gap-2 text-sm text-ds-text-muted">
            <input
              type="checkbox"
              checked={keepConnected}
              onChange={(e) => setKeepConnected(e.target.checked)}
              className="h-4 w-4 accent-ds-primary"
            />
            Mantenha-me conectado
          </label>

          <Button type="submit" disabled={loading} className="mb-4 w-full">
            {locating ? "Obtendo localização..." : loading ? "Entrando..." : "Entrar"}
          </Button>

          <div className="mb-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-ds-border-subtle" />
            <span className="text-xs font-semibold uppercase tracking-wide text-ds-text-secondary">
              ou
            </span>
            <span className="h-px flex-1 bg-ds-border-subtle" />
          </div>

          <button
            type="button"
            disabled
            title="Em breve"
            className="mb-4 flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] border border-ds-border bg-white text-sm font-bold text-ds-text-muted opacity-70 cursor-not-allowed"
          >
            <GoogleIcon />
            Continuar com Google
          </button>

          <Link href="/forgot-password" className="block text-center text-sm font-bold text-ds-primary-deep hover:text-ds-primary">
            Esqueci minha senha
          </Link>
        </form>

        <span className="mt-6 text-xs text-white/70">versão 1.0.0</span>
      </main>

      <CopyrightFooter />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2 1.5-4.6 2.5-7.7 2.5-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.9 39.7 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.6C41.6 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
