import { useState } from "react";
import type { Presence } from "@/lib/api";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const PRESENCE_COLOR: Record<Presence, string> = {
  online: "#00A972",
  away: "#FFB020",
  offline: "#A9B6C2",
};
const PRESENCE_LABEL = { online: "Online", away: "Ausente", offline: "Offline" };

export function UserAvatar({
  name,
  avatarUrl,
  presence,
  size = 36,
  tone = "default",
  spinner = false,
}: {
  name: string;
  avatarUrl?: string | null;
  presence?: Presence;
  size?: number;
  /** "light": fundo branco com iniciais azuis, para usar sobre fundos azuis (cabeçalho do celular). */
  tone?: "default" | "light";
  /** Mostra um indicador de carregamento enquanto a foto baixa. */
  spinner?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  return (
    <div className="relative shrink-0 select-none" style={{ width: size, height: size }} onDragStart={(e) => e.preventDefault()}>
      {avatarUrl && avatarUrl !== failedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={() => setLoadedUrl(avatarUrl)}
          onError={() => setFailedUrl(avatarUrl)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center rounded-full text-xs font-bold ${tone === "light" ? "bg-white text-ds-primary-deep" : "bg-ds-primary text-white"}`}
          style={{ fontSize: size * 0.36 }}
        >
          {getInitials(name)}
        </div>
      )}

      {spinner && avatarUrl && avatarUrl !== failedUrl && loadedUrl !== avatarUrl && (
        <span aria-label="Carregando foto" className="absolute inset-0 flex items-center justify-center rounded-full bg-white/90"><span className="h-1/2 w-1/2 animate-spin rounded-full border-2 border-ds-primary/25 border-t-ds-primary" /></span>
      )}

      {presence && (
        <svg
          role="img"
          aria-label={PRESENCE_LABEL[presence]}
          className="absolute bottom-0 right-0"
          width={size * 0.34}
          height={size * 0.34}
          viewBox="0 0 10 10"
        >
          <title>{PRESENCE_LABEL[presence]}</title>
          <circle cx="5" cy="5" r="4" fill={PRESENCE_COLOR[presence]} stroke="white" strokeWidth="1.5" />
        </svg>
      )}
    </div>
  );
}
