import assert from "node:assert/strict";
import { test } from "node:test";
import { dateBounds, EMPTY_FILTERS, matchesListFilters } from "./list-filters";

test("finds names and emails without case or accent sensitivity", () => {
  const date = new Date(2026, 9, 23, 12).toISOString();
  assert.ok(matchesListFilters("João Moura", "joao@example.com", date, { ...EMPTY_FILTERS, search: " JOAO " }));
  assert.ok(matchesListFilters("João Moura", "joao@example.com", date, { ...EMPTY_FILTERS, search: "EXAMPLE.COM" }));
  assert.equal(matchesListFilters("João Moura", "joao@example.com", date, { ...EMPTY_FILTERS, search: "Maria" }), false);
});
test("date range includes both whole local days, but not the following midnight", () => {
  const filters = { search: "", from: "2026-10-23", to: "2026-10-23" };
  for (const date of [new Date(2026, 9, 23, 0), new Date(2026, 9, 23, 23, 59, 59, 999)]) assert.ok(matchesListFilters("Ana", "ana@example.com", date.toISOString(), filters));
  for (const date of [new Date(2026, 9, 22, 23, 59, 59, 999), new Date(2026, 9, 24, 0)]) assert.equal(matchesListFilters("Ana", "ana@example.com", date.toISOString(), filters), false);
  const bounds = dateBounds(filters);
  assert.equal(bounds.from?.getTime(), new Date(2026, 9, 23).getTime());
  assert.equal(bounds.until?.getTime(), new Date(2026, 9, 24).getTime());
});
test("supports combined search, open-ended dates and clearing filters", () => {
  const date = new Date(2026, 9, 23, 12).toISOString();
  assert.ok(matchesListFilters("Ana", "ana@example.com", date, EMPTY_FILTERS));
  assert.ok(matchesListFilters("Ana", "ana@example.com", date, { search: "Ana", from: "2026-10-01", to: "" }));
  assert.equal(matchesListFilters("Ana", "ana@example.com", date, { search: "Ana", from: "", to: "2026-10-22" }), false);
  assert.equal(matchesListFilters("Ana", "ana@example.com", date, { search: "Bia", from: "2026-10-01", to: "2026-10-31" }), false);
});
