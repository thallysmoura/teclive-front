"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { AvatarUploader } from "@/components/ui/avatar-uploader";
import type { Me } from "@/lib/api";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Banner de boas-vindas da Visão Geral: nome, data, foto de quem está logado e (opcional) hora da última atualização. */
export function HomeBanner({ user, subtitle, updatedAt, onRefresh }: { user: Me; subtitle: string; updatedAt?: string; onRefresh?: () => void | Promise<unknown> }) {
  const [spinning, setSpinning] = useState(false);
  // O ícone gira enquanto atualiza (no mínimo um giro completo, para o clique sempre dar retorno visual).
  async function refresh() {
    if (spinning || !onRefresh) return;
    setSpinning(true);
    try { await Promise.all([Promise.resolve(onRefresh()), new Promise((r) => setTimeout(r, 800))]); } finally { setSpinning(false); }
  }
  const now = new Date();
  const first = user.name.trim().split(/\s+/)[0];
  const date = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]} de ${now.getFullYear()}`;
  return (
    <header style={{ backgroundImage: "url(/home/banner-bg.png)", backgroundSize: "cover", backgroundPosition: "center" }} className="relative mb-6 overflow-hidden rounded-[22px] bg-[#003B8E] shadow-[0_22px_44px_-20px_rgba(0,92,210,0.55)] ring-1 ring-inset ring-white/10">
      <div className="relative flex items-center gap-4 p-4 pr-16 sm:gap-6 sm:px-8 sm:py-7 sm:pr-8">
        <span className="shrink-0 rounded-full shadow-[0_0_44px_rgba(30,144,255,0.45)]">
          <span className="hidden sm:block"><AvatarUploader user={user} size={92} /></span>
          <span className="sm:hidden"><AvatarUploader user={user} size={54} /></span>
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold leading-tight tracking-tight text-[#D4E6FF] sm:text-[40px]">Olá, {first}!</h1>
          <p className="mt-0.5 flex items-center gap-2 text-[13px] font-medium leading-snug text-white/90 sm:mt-1 sm:gap-2.5 sm:text-xl">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-white/80 sm:h-[22px] sm:w-[22px]"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" /></svg>
            <span className="first-letter:uppercase">{date}</span>
          </p>
          <p className="mt-1 hidden text-sm text-white/65 lg:block">{subtitle}</p>
        </div>
        {onRefresh && (
          <div className="absolute right-3 top-3 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-lg backdrop-blur-md sm:static sm:pl-5 sm:pr-1.5">
            {updatedAt && <span className="hidden text-sm font-medium text-white sm:inline">Atualizado às {new Date(updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button type="button" onClick={() => void refresh()} disabled={spinning} aria-busy={spinning} aria-label="Atualizar painel" title="Atualizar" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1C93FF] text-white shadow-inner transition-colors hover:bg-[#3AA3FF]"><Icon name="refresh" className={`text-[24px] ${spinning ? "animate-spin motion-reduce:animate-none" : ""}`} /></button>
          </div>
        )}
      </div>
    </header>
  );
}
