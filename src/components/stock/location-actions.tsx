"use client";

import { useState } from "react";
import { deleteStockLocation, setPrincipalStockLocation, setStockLocationActive, type StockLocation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export type LocationAction = "principal" | "inactivate" | "activate" | "delete";

const CONFIRM: Record<LocationAction, { title: (d: string) => string; text: string; label: string; danger?: boolean }> = {
  principal: { title: (d) => `Definir "${d}" como principal?`, text: "O estoque principal anterior deixará de ser o principal.", label: "Definir como principal" },
  inactivate: { title: (d) => `Inativar "${d}"?`, text: "O local deixará de aparecer nas listagens, mas o histórico é mantido.", label: "Inativar", danger: true },
  activate: { title: (d) => `Ativar "${d}"?`, text: "O local voltará a ser exibido normalmente.", label: "Ativar" },
  delete: { title: (d) => `Excluir "${d}"?`, text: "Esta ação não pode ser desfeita. Locais com saldo ou balanços não podem ser excluídos.", label: "Excluir", danger: true },
};

export function useLocationActions({ onChanged, onDeleted }: { onChanged: () => void; onDeleted?: () => void }) {
  const [pending, setPending] = useState<{ location: StockLocation; action: LocationAction } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (!pending) return;
    setBusy(true); setError("");
    try {
      const { location, action } = pending;
      if (action === "principal") await setPrincipalStockLocation(location.id);
      else if (action === "delete") await deleteStockLocation(location.id);
      else await setStockLocationActive(location.id, action === "activate");
      setPending(null);
      if (action === "delete" && onDeleted) onDeleted(); else onChanged();
    } catch (e) {
      setPending(null);
      setError(e instanceof Error ? e.message : "Não foi possível concluir a operação.");
    } finally {
      setBusy(false);
    }
  }

  return {
    pending, busy, error, confirm,
    run: (location: StockLocation, action: LocationAction) => { setError(""); setPending({ location, action }); },
    cancel: () => setPending(null),
  };
}

export function LocationActionsModal({ controller }: { controller: ReturnType<typeof useLocationActions> }) {
  const { pending, busy, cancel, confirm } = controller;
  const meta = pending ? CONFIRM[pending.action] : null;
  return (
    <Modal open={!!pending} onClose={cancel} labelledBy="location-action-title">
      {pending && meta && (
        <>
          <h2 id="location-action-title" className="mb-2 text-lg font-bold text-ds-primary-deep">{meta.title(pending.location.description)}</h2>
          <p className="mb-6 text-sm text-ds-text-muted">{meta.text}</p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={cancel}>Cancelar</Button>
            <Button type="button" variant={meta.danger ? "danger" : "primary"} onClick={confirm} disabled={busy}>{busy ? "Aguarde..." : meta.label}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
