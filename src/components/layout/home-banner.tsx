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
    <header className="relative mb-6 overflow-hidden rounded-[22px] bg-[#003B8E] bg-[url(/home/banner-bg.png)] bg-cover bg-[position:85%_center] sm:bg-center shadow-[0_22px_44px_-20px_rgba(0,92,210,0.55)] ring-1 ring-inset ring-white/10">
      <div className="relative flex items-center gap-3 p-4 pr-[60px] sm:gap-5 sm:px-7 sm:py-6 sm:pr-7 xl:gap-6 xl:px-8 xl:py-7">
        <span className="shrink-0 rounded-full">
          <span className="sm:hidden"><AvatarUploader user={user} size={56} /></span>
          <span className="hidden sm:block xl:hidden"><AvatarUploader user={user} size={72} /></span>
          <span className="hidden xl:block"><AvatarUploader user={user} size={92} /></span>
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-[clamp(1.75rem,4.5vw,2.5rem)] font-extrabold leading-tight tracking-tight text-[#D4E6FF]">Olá, {first}!</h1>
          <p className="mt-0.5 flex items-center gap-2 text-[clamp(0.78rem,1.9vw,1.25rem)] font-medium leading-snug text-white/90 sm:mt-1 sm:gap-2.5">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-white/80 xl:h-[22px] xl:w-[22px]"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" /></svg>
            <span className="first-letter:uppercase">{date}</span>
          </p>
          <p className="mt-1 hidden text-sm text-white/65 lg:block">{subtitle}</p>
        </div>
        {onRefresh && (
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-1 backdrop-blur-md sm:static sm:translate-y-0 sm:rounded-2xl sm:shrink-0 sm:p-1.5 xl:pl-5">
            {updatedAt && <span className="hidden whitespace-nowrap text-sm font-medium text-white xl:inline">Atualizado às {new Date(updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button type="button" onClick={() => void refresh()} disabled={spinning} aria-busy={spinning} aria-label="Atualizar painel" title="Atualizar" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1C93FF] sm:h-11 sm:w-11 sm:rounded-xl text-white shadow-inner transition-colors hover:bg-[#3AA3FF]"><Icon name="refresh" className={`text-[18px] sm:text-[24px] ${spinning ? "animate-spin motion-reduce:animate-none" : ""}`} /></button>
          </div>
        )}
      </div>
    </header>
  );
}
