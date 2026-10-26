import type { NextConfig } from "next";

// Cabeçalhos de segurança de todas as páginas (contra clickjacking, sniffing de tipo, vazamento de referrer e downgrade para http).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "*.googleusercontent.com" }] },
  cacheComponents: true,
  poweredByHeader: false,
  // Acesso pelo túnel do celular (cloudflared): libera os recursos de desenvolvimento para esse domínio.
  allowedDevOrigins: ["*.trycloudflare.com", "teclive.mouora.com"],
  partialPrefetching: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Páginas nunca ficam em cache (cada publicação aparece na hora); os arquivos com hash em /_next/static continuam em cache longo.
      { source: "/((?!_next/static|_next/image|pwa/|icon.png|favicon.ico|manifest.webmanifest).*)", headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }] },
      { source: "/pwa/:path*", headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }] },
      { source: "/icon.png", headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }] },
      { source: "/favicon.ico", headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }] },
      { source: "/manifest.webmanifest", headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }] },
      { source: "/sw.js", headers: [
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
      ] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        condition: { not: { path: "*.module.css" } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
