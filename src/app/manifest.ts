import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "euGestor · tecLive",
    short_name: "euGestor",
    description: "Gestão de usuários, acessos e aplicações tecLive.",
    lang: "pt-BR",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7f9",
    theme_color: "#005888",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
