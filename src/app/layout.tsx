import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { NavigationTransition } from "@/components/layout/navigation-transition";
import { AppSplash } from "@/components/layout/app-splash";
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
  applicationName: "Teclive Tecnologia",
  openGraph: { title: "Teclive Serviços em Tecnologia", description: "Gestão de usuários, acessos e aplicações tecLive.", siteName: "Teclive Tecnologia", locale: "pt_BR", type: "website", images: [{ url: "/pwa/icon-512.png?v=3", width: 512, height: 512 }] },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Teclive Tecnologia" },
  icons: { icon: [{ url: "/icon.png?v=3", type: "image/png", sizes: "512x512" }], shortcut: "/icon.png?v=3", apple: "/pwa/apple-touch-icon.png?v=3" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#00558C",
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
      <body className="min-h-full flex flex-col"><AppSplash /><NavigationTransition>{children}</NavigationTransition><PwaInstall /></body>
    </html>
  );
}
