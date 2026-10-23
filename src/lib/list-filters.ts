export type ListFilters = { search: string; from: string; to: string };
export const EMPTY_FILTERS: ListFilters = { search: "", from: "", to: "" };

export function dateBounds(filters: ListFilters) {
  const from = filters.from ? new Date(`${filters.from}T00:00:00`) : undefined;
  const until = filters.to ? new Date(`${filters.to}T00:00:00`) : undefined;
  if (until) until.setDate(until.getDate() + 1);
  return { from, until };
}

export function matchesListFilters(name: string, email: string, createdAt: string, filters: ListFilters) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const search = normalize(filters.search.trim());
  if (search && !normalize(`${name} ${email}`).includes(search)) return false;
  const { from, until } = dateBounds(filters);
  const value = new Date(createdAt);
  return (!from || value >= from) && (!until || value < until);
}
