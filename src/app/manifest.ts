import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Teclive Tecnologia",
    short_name: "Teclive",
    description: "Gestão de usuários, acessos e aplicações tecLive.",
    lang: "pt-BR",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#00558C",
    theme_color: "#00558C",
    icons: [
      { src: "/pwa/icon-192.png?v=3", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png?v=3", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png?v=3", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png?v=3", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
