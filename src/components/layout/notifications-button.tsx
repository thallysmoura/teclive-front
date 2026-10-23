"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

function BellIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
  </svg>;
}

export function NotificationsButton({ desktopInSidebar = false }: { desktopInSidebar?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Notificações" title="Notificações" aria-haspopup="dialog" className={`fixed right-3 top-2 z-30 flex h-12 w-12 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:h-10 md:w-10 ${desktopInSidebar ? "md:left-48 md:right-auto md:top-10 md:bg-white/10 md:hover:bg-white/15" : "md:right-6 md:top-4 md:border md:border-ds-border-subtle md:bg-white md:text-ds-primary-deep md:shadow-sm md:hover:bg-ds-primary/10 md:focus-visible:ring-ds-primary"}`}>
      <BellIcon />
    </button>
    <Modal open={open} onClose={() => setOpen(false)} labelledBy="notifications-title">
      <div className="flex min-h-full flex-col md:min-h-0">
        <h2 id="notifications-title" className="text-xl font-bold text-ds-primary-deep">Notificações</h2>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ds-primary/10 text-ds-primary"><BellIcon className="h-7 w-7" /></span>
          <p className="text-sm text-ds-text-secondary">Suas notificações aparecerão aqui.</p>
        </div>
        <Button variant="secondary" className="hidden w-full md:block" onClick={() => setOpen(false)}>Fechar</Button>
      </div>
    </Modal>
  </>;
}
