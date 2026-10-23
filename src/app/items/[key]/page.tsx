"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMe, getNavigationPage, logout, type Me, type NavigationItem } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { FullScreenSpinner } from "@/components/ui/spinner";
import { AwaitingPermission } from "@/components/layout/awaiting-permission";

export default function CustomItemPage() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [item, setItem] = useState<NavigationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    async function load(initial = false) {
      setError(null);
      if (initial) setLoading(true);
      try {
        const me = await getMe();
        if (disposed) return;
        if (!me) { router.replace("/login"); return; }
        setUser(me);
        const page = await getNavigationPage(key);
        if (!disposed) {
          setItem(page);
          if (page?.href && page.href !== `/items/${key}`) router.replace(page.href);
        }
      } catch (failure) { if (!disposed) setError(failure instanceof Error ? failure.message : "Não foi possível carregar a página."); }
      finally { if (!disposed) setLoading(false); }
    }
    void load(true);
    const refresh = () => { void load(); };
    window.addEventListener("sidebar:updated", refresh);
    return () => { disposed = true; window.removeEventListener("sidebar:updated", refresh); };
  }, [key, router]);

  async function handleLogout() { await logout(); router.replace("/login"); }
  if (loading) return <FullScreenSpinner />;
  if (!user) return error ? <p role="alert" className="p-6 text-ds-danger-text">{error}</p> : <FullScreenSpinner />;

  return (
    <div className="flex h-dvh overflow-hidden bg-ds-bg">
      <Sidebar user={user} onLogout={handleLogout} />
      {!item && !error ? <AwaitingPermission user={user} /> : (
        <main className="flex min-h-0 min-w-0 flex-1 flex-col px-2 pb-2 pt-20 md:px-4 md:pb-4 md:pt-4">
          <div className="flex min-h-0 w-full flex-1 flex-col">
            {error ? <p role="alert" className="text-sm text-ds-danger-text">{error}</p> : <>
              <h1 className="mb-3 shrink-0 break-words text-2xl font-extrabold tracking-tight text-ds-primary-deep sm:text-[34px] md:pr-16">{item?.label}</h1>
              {item?.embedUrl ? <iframe key={item.embedUrl} src={item.embedUrl} title={item.label} sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads" referrerPolicy="strict-origin-when-cross-origin" className="min-h-0 w-full flex-1 rounded-xl border border-ds-border-subtle bg-white" /> : <div className="min-h-0 flex-1 rounded-xl border border-ds-border-subtle bg-white" />}
            </>}
          </div>
        </main>
      )}
    </div>
  );
}
