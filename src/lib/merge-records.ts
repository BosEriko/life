export function mergeById<T extends { id: string; date: string }>(
  live: T[],
  older: T[],
): T[] {
  if (older.length === 0) return live;
  const seen = new Set(live.map((row) => row.id));
  return live
    .concat(older.filter((row) => !seen.has(row.id)))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function mergeByDate<T extends { date: string }>(
  live: T[],
  older: T[],
): T[] {
  if (older.length === 0) return live;
  const seen = new Set(live.map((row) => row.date));
  return live
    .concat(older.filter((row) => !seen.has(row.date)))
    .sort((a, b) => b.date.localeCompare(a.date));
}
