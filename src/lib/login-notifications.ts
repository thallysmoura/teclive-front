const STORAGE_KEY = "eugestor:notification-permission-requested";
const requestedWindows = new WeakSet<Window>();

export function requestLoginNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (!window.isSecureContext || !("Notification" in window) || typeof window.Notification.requestPermission !== "function") return Promise.resolve("unsupported");
  if (window.Notification.permission !== "default") return Promise.resolve(window.Notification.permission);
  if (requestedWindows.has(window)) return Promise.resolve("default");
  try { if (window.localStorage.getItem(STORAGE_KEY) === "1") return Promise.resolve("default"); } catch { /* Private browsing may block storage. */ }
  requestedWindows.add(window);
  try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* The in-memory guard still prevents repeated prompts. */ }

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("default"), 8500);
    try {
      // Called synchronously from the login click, before any await, to preserve user activation.
      void window.Notification.requestPermission().then(
        (permission) => { clearTimeout(timer); resolve(permission); },
        () => { clearTimeout(timer); resolve("default"); },
      );
    } catch { clearTimeout(timer); resolve("default"); }
  });
}
