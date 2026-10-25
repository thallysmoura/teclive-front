"use client";

import { Icon } from "@/components/ui/icon";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Me } from "@/lib/api";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Marca da empresa (rede de pontos) em grande escala, translúcida, como textura do banner. */
function BrandTexture() {
  return (
    <svg aria-hidden="true" viewBox="0 0 640 200" preserveAspectRatio="xMaxYMid slice" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[68%] min-w-[420px]">
      <defs>
        <radialGradient id="hb-glow" cx="62%" cy="40%" r="60%"><stop offset="0%" stopColor="#5BB2FF" stopOpacity="0.38" /><stop offset="100%" stopColor="#0A8CFF" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="640" height="200" fill="url(#hb-glow)" />
      <circle cx="170" cy="150" r="190" fill="none" stroke="#7FC0FF" strokeOpacity="0.28" strokeWidth="1.6" />
      <circle cx="150" cy="150" r="150" fill="#2D8CFF" fillOpacity="0.08" />
      <g stroke="#3F9BFF" strokeOpacity="0.55" strokeWidth="13" strokeLinecap="round">
        <line x1="368" y1="52" x2="262" y2="110" /><line x1="262" y1="110" x2="248" y2="196" /><line x1="368" y1="52" x2="468" y2="160" />
        <line x1="262" y1="110" x2="170" y2="118" /><line x1="368" y1="52" x2="292" y2="40" />
      </g>
      <g fill="#3F9BFF" fillOpacity="0.55"><circle cx="368" cy="52" r="42" /><circle cx="262" cy="110" r="22" /><circle cx="170" cy="118" r="18" /><circle cx="292" cy="40" r="20" /><circle cx="486" cy="190" r="22" /></g>
    </svg>
  );
}

/** Banner de boas-vindas da Visão Geral: nome, data, foto de quem está logado e (opcional) hora da última atualização. */
export function HomeBanner({ user, subtitle, updatedAt, onRefresh }: { user: Me; subtitle: string; updatedAt?: string; onRefresh?: () => void }) {
  const now = new Date();
  const first = user.name.trim().split(/\s+/)[0];
  const date = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]} de ${now.getFullYear()}`;
  return (
    <header className="relative mb-6 overflow-hidden rounded-[22px] bg-[linear-gradient(100deg,#00225A_0%,#003B8E_40%,#0067D8_74%,#0A8CFF_100%)] shadow-[0_22px_44px_-20px_rgba(0,92,210,0.55)] ring-1 ring-inset ring-white/10">
      <BrandTexture />
      <div className="relative flex items-center gap-4 p-4 pr-16 sm:gap-6 sm:px-8 sm:py-7 sm:pr-8">
        <span className="shrink-0 rounded-full bg-white/10 p-2 shadow-[0_0_44px_rgba(30,144,255,0.45)] ring-1 ring-white/15 sm:p-3">
          <span className="hidden sm:block"><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={92} presence="online" /></span>
          <span className="sm:hidden"><UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={54} presence="online" /></span>
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold leading-tight tracking-tight text-[#D4E6FF] sm:text-[40px]">Olá, {first}!</h1>
          <p className="mt-0.5 text-[13px] font-medium leading-snug text-white/90 first-letter:uppercase sm:mt-1 sm:text-xl">{date}</p>
          <p className="mt-1 hidden text-sm text-white/65 lg:block">{subtitle}</p>
        </div>
        {onRefresh && (
          <div className="absolute right-3 top-3 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-lg backdrop-blur-md sm:static sm:pl-5 sm:pr-1.5">
            {updatedAt && <span className="hidden text-sm font-medium text-white sm:inline">Atualizado às {new Date(updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button type="button" onClick={onRefresh} aria-label="Atualizar painel" title="Atualizar" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1C93FF] text-white shadow-inner transition-colors hover:bg-[#3AA3FF]"><Icon name="refresh" className="text-[24px]" /></button>
          </div>
        )}
      </div>
    </header>
  );
}
