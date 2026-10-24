"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb, PageShell } from "@/components/layout/page-shell";
import { SectionView } from "@/components/settings/settings-views";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Icon } from "@/components/ui/icon";
import { sectionBySlug } from "@/lib/settings-schema";

export default function SettingsSectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const section = sectionBySlug(slug);
  useEffect(() => { if (!section) router.replace("/configuracoes/empresa-config"); else if (section.href) router.replace(section.href); }, [section, router]);

  return (
    <PageShell permissionKey={null}>
      {(user) => (
        <>
          <Breadcrumb items={[{ label: "Início", href: "/home" }, { label: "Configurações", href: "/configuracoes" }, ...(section ? [{ label: section.title }] : [])]} />
          <SettingsShell active={slug} admin={user.role === "ADMIN"}>
            {user.role !== "ADMIN" ? (
              <div className="rounded-2xl border border-ds-border-subtle bg-white p-10 text-center"><Icon name="lock" className="!text-[44px] text-ds-border" /><p className="mt-2 text-sm text-ds-text-secondary">As configurações da empresa são restritas a administradores.</p></div>
            ) : section && !section.href ? <SectionView key={section.slug} section={section} /> : null}
          </SettingsShell>
        </>
      )}
    </PageShell>
  );
}
