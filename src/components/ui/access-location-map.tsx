"use client";

import { useEffect, useRef, useState } from "react";

export function AccessLocationMap({ latitude, longitude, accuracy, compact = false }: { latitude: number; longitude: number; accuracy: number | null; compact?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    let observer: ResizeObserver | undefined;
    void import("leaflet").then((L) => {
      if (disposed || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false, dragging: !compact, touchZoom: !compact, doubleClickZoom: !compact, keyboard: !compact, zoomControl: !compact, boxZoom: !compact }).setView([latitude, longitude], 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      if (accuracy && accuracy > 0) {
        const area = L.circle([latitude, longitude], { radius: accuracy, color: "#008dff", fillOpacity: 0.1, weight: 1 }).addTo(map);
        map.fitBounds(area.getBounds(), { maxZoom: 15, padding: [24, 24] });
      }
      L.circleMarker([latitude, longitude], { radius: 8, color: "white", fillColor: "#008dff", fillOpacity: 1, weight: 3 }).addTo(map);
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(container.current);
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; observer?.disconnect(); map?.remove(); };
  }, [latitude, longitude, accuracy, compact]);

  if (failed) return <p role="alert" className="py-8 text-sm text-ds-danger-text">Não foi possível carregar o mapa.</p>;
  return <div ref={container} role="region" aria-label="Mapa da localização informada no login" className={compact ? "relative z-0 h-52 w-full overflow-hidden rounded-lg border border-ds-border-subtle" : "relative z-0 min-h-72 w-full flex-1 overflow-hidden rounded-xl border border-ds-border-subtle md:h-80 md:flex-none"} />;
}
