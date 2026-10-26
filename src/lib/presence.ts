"use client";

import { useSyncExternalStore } from "react";
import { io, type Socket } from "socket.io-client";
import { restorePresenceSession, type ManagedUser } from "@/lib/api";

type PresenceUpdate = Pick<ManagedUser, "id" | "presence"> & Partial<Pick<ManagedUser, "lastLoginAt" | "lastDevice" | "lastSeenAt">>;
type Snapshot = { connected: boolean; users: Record<string, PresenceUpdate> };
const empty: Snapshot = { connected: false, users: {} };
let snapshot = empty;
const listeners = new Set<() => void>();
let socket: Socket | null = null;
let consumers = 0;
let teardown: (() => void) | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | undefined;
let notifyLogout: (() => void) | undefined;

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function usePresence() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => snapshot,
    () => empty,
  );
}

export function stopPresence() {
  notifyLogout?.();
  closePresence();
}

function closePresence() {
  clearTimeout(releaseTimer);
  teardown?.();
  teardown = null;
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  publish(empty);
}

export function acquirePresence() {
  consumers++;
  clearTimeout(releaseTimer);
  if (!socket) start();
  return () => {
    consumers = Math.max(0, consumers - 1);
    if (!consumers) releaseTimer = setTimeout(closePresence, 250);
  };
}

function start() {
  let stopped = false;
  let recovering = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let trailingActivity: ReturnType<typeof setTimeout> | undefined;
  let lastActivity = Date.now();
  let lastSent = 0;
  const visible = () => document.visibilityState === "visible" && document.hasFocus();
  const client = io(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4301"}/presence`, {
    transports: ["websocket"],
    withCredentials: true,
    autoConnect: false,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: (callback) => callback({ visible: visible(), idle: Date.now() - lastActivity >= 300_000 }),
  });
  socket = client;

  const sendActivity = () => {
    if (!client.connected || stopped) return;
    lastSent = Date.now();
    client.emit("presence:activity", { visible: visible() });
  };
  const activity = () => {
    if (!visible()) return;
    lastActivity = Date.now();
    if (Date.now() - lastSent >= 2000) sendActivity();
    else if (!trailingActivity) trailingActivity = setTimeout(() => {
      trailingActivity = undefined;
      sendActivity();
    }, 2000 - (Date.now() - lastSent));
  };
  const visibility = () => {
    if (visible() || Date.now() - lastActivity < 300_000) lastActivity = Date.now();
    clearTimeout(trailingActivity);
    trailingActivity = undefined;
    sendActivity();
  };

  async function recover() {
    if (recovering || stopped) return;
    recovering = true;
    try {
      const valid = await restorePresenceSession();
      if (stopped) return;
      if (!valid) { stopPresence(); return; }
      client.connect();
    } catch {
      if (!stopped) retry = setTimeout(() => { void recover(); }, 3000);
    } finally {
      recovering = false;
    }
  }

  client.on("connect", () => publish({ ...snapshot, connected: true }));
  client.on("presence:snapshot", (users: PresenceUpdate[]) => {
    publish({ connected: true, users: Object.fromEntries(users.map((user) => [user.id, user])) });
  });
  client.on("presence:update", (update: PresenceUpdate) => {
    publish({ ...snapshot, users: { ...snapshot.users, [update.id]: { ...snapshot.users[update.id], ...update } } });
  });
  client.on("notification:new", () => window.dispatchEvent(new Event("eg:notifications")));
  client.on("disconnect", () => publish({ ...snapshot, connected: false }));
  client.on("presence:expired", () => {
    client.disconnect();
    void recover();
  });
  client.on("presence:logout", stopPresence);
  client.on("connect_error", (error) => {
    if ((error as Error & { data?: { code?: string } }).data?.code === "UNAUTHORIZED") {
      retry = setTimeout(() => { void recover(); }, 1000);
    }
  });
  const pagehide = () => client.disconnect();
  const pageshow = () => { if (!stopped) client.connect(); };
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("teclive-presence-session") : null;
  if (channel) channel.onmessage = (event) => { if (event.data === "logout") closePresence(); };
  notifyLogout = () => channel?.postMessage("logout");
  const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
  events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("focus", visibility);
  window.addEventListener("blur", visibility);
  window.addEventListener("pagehide", pagehide);
  window.addEventListener("pageshow", pageshow);
  teardown = () => {
    stopped = true;
    notifyLogout = undefined;
    channel?.close();
    clearTimeout(retry);
    clearTimeout(trailingActivity);
    events.forEach((event) => window.removeEventListener(event, activity));
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("focus", visibility);
    window.removeEventListener("blur", visibility);
    window.removeEventListener("pagehide", pagehide);
    window.removeEventListener("pageshow", pageshow);
  };
  client.connect();
}

// Painel de Acompanhamento: só quem está com a tela aberta entra na sala e recebe os eventos.
const opsHandlers = new Set<(event: unknown) => void>();
export function subscribeOps(handler: (event: unknown) => void) {
  opsHandlers.add(handler);
  const release = acquirePresence();
  const join = () => socket?.emit("ops:join");
  socket?.on("connect", join);
  const bound = socket;
  if (socket?.connected) join();
  const relay = (event: unknown) => opsHandlers.forEach((h) => h(event));
  socket?.on("ops:event", relay);
  return () => {
    opsHandlers.delete(handler);
    bound?.off("connect", join);
    bound?.off("ops:event", relay);
    if (!opsHandlers.size) bound?.emit("ops:leave");
    release();
  };
}
