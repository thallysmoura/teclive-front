export const MOVEMENTS_PERMISSION_KEY = "item_19e99fd0-4268-4475-9dcf-15708724f034";

export const MOVEMENT_ORIGINS: Record<number, string> = { 2: "Movimento Avulso", 4: "Ordem de Serviço", 6: "Fatura", 7: "Entrada de NF" };

/** 19/10/2026 às 10:30h */
export function formatMovementDate(value: string) {
  const d = new Date(value);
  const date = d.toLocaleDateString("pt-BR");
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }).replace(":", ":");
  return `${date} às ${time}h`;
}

export const formatMoney = (value: number | string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatQty = (value: number | string) => Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
