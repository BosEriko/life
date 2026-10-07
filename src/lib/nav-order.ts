export const NAV_IDS = ["health", "journal", "finance", "records"] as const;

export type NavId = (typeof NAV_IDS)[number];

export const SUBMENU_IDS = {
  journal: ["notes", "tasks", "todo", "board"],
  finance: ["dashboard", "accounts", "records", "analytics"],
  records: ["database", "summary"],
} as const;

export type SubmenuSection = keyof typeof SUBMENU_IDS;

export type SubmenuOrder = { [Section in SubmenuSection]: string[] };

export function readOrder<T extends string>(value: unknown, ids: readonly T[]): T[] {
  const known = new Set<string>(ids);
  const picked = Array.isArray(value) ? value.filter((id): id is T => typeof id === "string" && known.has(id)) : [];
  const unique = [...new Set(picked)];
  return [...unique, ...ids.filter((id) => !unique.includes(id))];
}

export function readNavOrder(value: unknown): NavId[] {
  return readOrder(value, NAV_IDS);
}

export function readSubmenuOrder(value: unknown): SubmenuOrder {
  const data = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    journal: readOrder(data.journal, SUBMENU_IDS.journal),
    finance: readOrder(data.finance, SUBMENU_IDS.finance),
    records: readOrder(data.records, SUBMENU_IDS.records),
  };
}

export function isSubmenuSection(value: string): value is SubmenuSection {
  return value in SUBMENU_IDS;
}

export function orderBy<T extends { id: string }>(items: T[], order: readonly string[]): T[] {
  return [...items].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}
