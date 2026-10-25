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
}: {
  name: string;
  avatarUrl?: string | null;
  presence?: Presence;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className="relative shrink-0 select-none" style={{ width: size, height: size }} onDragStart={(e) => e.preventDefault()}>
      {avatarUrl && avatarUrl !== failedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setFailedUrl(avatarUrl)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full bg-ds-primary text-xs font-bold text-white"
          style={{ fontSize: size * 0.36 }}
        >
          {getInitials(name)}
        </div>
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
