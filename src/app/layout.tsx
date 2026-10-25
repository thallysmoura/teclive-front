import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { NavigationTransition } from "@/components/layout/navigation-transition";
import { PwaInstall } from "@/components/layout/pwa-install";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Teclive Serviços em Tecnologia",
  description: "Gestão de usuários, acessos e aplicações tecLive.",
  applicationName: "euGestor",
  openGraph: { title: "Teclive Serviços em Tecnologia", description: "Gestão de usuários, acessos e aplicações tecLive.", siteName: "euGestor", locale: "pt_BR", type: "website", images: [{ url: "/pwa/icon-512.png", width: 512, height: 512 }] },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "euGestor" },
  icons: { icon: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }], shortcut: "/icon.png", apple: "/pwa/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#005888",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body className="min-h-full flex flex-col"><NavigationTransition>{children}</NavigationTransition><PwaInstall /></body>
    </html>
  );
}
