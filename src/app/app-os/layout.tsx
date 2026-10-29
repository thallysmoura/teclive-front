import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Gestão de OS",
  manifest: "/app-os.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Gestão de OS" },
};
export const viewport: Viewport = { themeColor: "#4B66A8", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function AppOsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[#F1F3F7] text-[#2B3445]">{children}</div>;
}
