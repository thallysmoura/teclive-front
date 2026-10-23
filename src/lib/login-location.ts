import type { LoginLocation } from "./api";

export function requestLoginLocation(): Promise<LoginLocation> {
  if (!window.isSecureContext || !navigator.geolocation) return Promise.resolve({ locationStatus: "unavailable" });
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ locationStatus: "unavailable" }), 8500);
    try { navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        clearTimeout(timer);
        resolve({ locationStatus: "shared", location: { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy } });
      },
      (error) => { clearTimeout(timer); resolve({ locationStatus: error.code === 1 ? "denied" : "unavailable" }); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 },
    ); } catch { clearTimeout(timer); resolve({ locationStatus: "unavailable" }); }
  });
}
