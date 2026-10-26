import { authFetch } from "@/lib/api";

export const PAINEL_KEY = "item_7c2e9b40-4d1a-4f6b-9a3e-5b8d1c2f6a77";

export type OpsEventType = "comment" | "attachment" | "interrupted" | "closed" | "cancelled" | "reopened";
export type OpsEvent = {
  id: string; type: OpsEventType; orderId: string | null; orderNumber: number | null; clientName: string | null;
  userId: string | null; userName: string; avatarUrl: string | null; text: string | null; imageUrl: string | null; createdAt: string;
};
export type OpsOrderRow = { id: string; number: number; client: string; defect: string | null; technicians: string[]; scheduleEnd: string | null; interruptedAt: string | null };
export type OpsPanel = {
  kpis: { open: number; late: number; interrupted: number; ready: number; closedToday: number; scheduledToday: number; commentsToday: number };
  interrupted: OpsOrderRow[]; late: OpsOrderRow[]; events: OpsEvent[]; now: string;
};

export async function fetchPanel(): Promise<OpsPanel> {
  const res = await authFetch("/ops/panel");
  if (!res.ok) throw new Error("Não foi possível carregar o painel.");
  return res.json();
}

export const osNumber = (n: number | null) => (n == null ? "" : `${String(Math.floor(n / 1000)).padStart(3, "0")}.${String(n % 1000).padStart(3, "0")}`);

export const EVENT_META: Record<OpsEventType, { label: string; verb: string; icon: string; color: string }> = {
  comment: { label: "Comentário", verb: "comentou na", icon: "chat", color: "#4DA3FF" },
  attachment: { label: "Anexo", verb: "anexou foto na", icon: "photo_camera", color: "#9B7BFF" },
  interrupted: { label: "Impedimento", verb: "interrompeu a", icon: "report", color: "#FF5C5C" },
  closed: { label: "Fechada", verb: "fechou a", icon: "check_circle", color: "#2ED58B" },
  cancelled: { label: "Cancelada", verb: "cancelou a", icon: "cancel", color: "#9AA7B5" },
  reopened: { label: "Reaberta", verb: "reabriu a", icon: "replay", color: "#F7941D" },
};

/** Sons gerados no navegador (sem arquivos): um tom por tipo de evento. */
let ctx: AudioContext | null = null;
export function audioReady() { return !!ctx && ctx.state === "running"; }
export async function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state !== "running") await ctx.resume();
  } catch { /* sem áudio */ }
  return audioReady();
}
export function playSound(type: OpsEventType) {
  if (!ctx || ctx.state !== "running") return;
  const c = ctx, t0 = c.currentTime + 0.02;
  const seq: Record<OpsEventType, [number, number, OscillatorType][]> = {
    comment: [[880, 0, "sine"], [1318, 0.16, "sine"]],
    attachment: [[988, 0, "sine"], [1175, 0.12, "sine"], [1568, 0.24, "sine"]],
    interrupted: [[440, 0, "square"], [330, 0.22, "square"], [440, 0.44, "square"], [330, 0.66, "square"]],
    closed: [[660, 0, "triangle"], [880, 0.14, "triangle"], [1320, 0.28, "triangle"]],
    cancelled: [[392, 0, "sine"], [294, 0.2, "sine"]],
    reopened: [[523, 0, "triangle"], [659, 0.15, "triangle"]],
  };
  for (const [freq, at, wave] of seq[type]) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = wave; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0 + at);
    g.gain.exponentialRampToValueAtTime(wave === "square" ? 0.12 : 0.28, t0 + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.4);
    o.connect(g).connect(c.destination);
    o.start(t0 + at); o.stop(t0 + at + 0.45);
  }
}
