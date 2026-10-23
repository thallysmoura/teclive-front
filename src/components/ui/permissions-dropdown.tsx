"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import type { Permission } from "@/lib/api";

export function PermissionsDropdown({
  catalog,
  selected,
  disabled,
  onToggle,
  fullWidth = false,
  floating = false,
  admin = false,
  onAdminToggle,
  adminDisabled = false,
  compact = false,
  emptyLabel,
}: {
  catalog: Permission[];
  selected: string[];
  disabled?: boolean;
  onToggle: (key: string) => void;
  fullWidth?: boolean;
  floating?: boolean;
  admin?: boolean;
  onAdminToggle?: () => void;
  adminDisabled?: boolean;
  compact?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({});

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !floating) return;
    const close = (event: Event) => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, floating]);

  const renderPanel = (panel: ReactNode) => floating ? createPortal(panel, document.body) : panel;

  const label = admin
    ? "Todas (admin)"
    : selected.length === 0 && emptyLabel ? emptyLabel : compact ? `${selected.length} de ${catalog.length}` : selected.length === 0
      ? "Selecione as permissões"
      : `${selected.length} ${selected.length === 1 ? "permissão selecionada" : "permissões selecionadas"}`;
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const filtered = catalog.filter((permission) => normalize(permission.label).includes(normalize(query.trim())));
  const showAdmin = !!onAdminToggle && normalize("Administrador").includes(normalize(query.trim()));

  return (
    <div
      ref={ref}
      className={fullWidth ? "relative w-full" : "relative inline-block"}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={`Permissões: ${label}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          if (floating && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const below = window.innerHeight - rect.bottom - 16;
            const above = rect.top - 16;
            const upwards = below < 240 && above > below;
            const width = Math.min(288, window.innerWidth - 32);
            setPosition({
              position: "fixed",
              width,
              left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)),
              ...(upwards ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
              maxHeight: Math.max(80, upwards ? above : below),
              overflowY: "auto",
              zIndex: 60,
            });
          }
          setQuery("");
          setOpen((v) => !v);
        }}
        className={`flex items-center justify-between gap-2 rounded-[10px] border border-ds-border bg-white px-3 text-sm text-ds-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary disabled:cursor-not-allowed disabled:bg-ds-bg disabled:text-ds-text-secondary ${fullWidth ? "h-11 w-full" : "py-1.5"}`}
      >
        {label}
        <Icon name={open ? "expand_less" : "expand_more"} className="text-[18px]" />
      </button>

      {open && renderPanel(
        <div
          ref={panelRef}
          id={id}
          role="group"
          aria-label="Permissões disponíveis"
          style={floating ? position : undefined}
          className={`rounded-[10px] border border-ds-border-subtle bg-white p-2 shadow-lg ${floating ? "" : `absolute left-0 z-20 ${fullWidth ? "bottom-full mb-2 w-full" : "top-full mt-1 w-64"}`}`}
        >
          <Input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
            placeholder="Filtrar permissões..."
            aria-label="Filtrar permissões"
          />
          <div className="mt-2 max-h-40 overflow-y-auto overscroll-contain">
          {showAdmin && (
            <label className="mb-1 flex cursor-pointer items-center gap-2 rounded-md border-b border-ds-border-subtle px-2 py-2 text-sm font-semibold text-ds-text hover:bg-ds-bg">
              <input
                type="checkbox"
                checked={admin}
                disabled={disabled || adminDisabled}
                onChange={onAdminToggle}
                className="h-4 w-4 accent-ds-primary"
              />
              Administrador
            </label>
          )}
          {filtered.map((perm) => (
            <label
              key={perm.key}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ds-text hover:bg-ds-bg"
            >
              <input
                type="checkbox"
                disabled={disabled || admin}
                checked={admin || selected.includes(perm.key)}
                onChange={() => onToggle(perm.key)}
                className="h-4 w-4 accent-ds-primary"
              />
              {perm.label}
            </label>
          ))}
          {filtered.length === 0 && !showAdmin && (
            <p role="status" className="px-2 py-3 text-sm text-ds-text-secondary">
              {catalog.length === 0 ? "Nenhuma permissão disponível." : "Nenhuma permissão encontrada."}
            </p>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
