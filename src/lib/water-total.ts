export type RawWaterLog = {
  date: string;
  ml: number;
  time?: string | null;
};

export type DailyWater = {
  date: string;
  ml: number;
  count: number;
  lastTime: string | null;
};

export function dailyWaterTotals(
  logs: RawWaterLog[],
): Map<string, DailyWater> {
  const byDate = new Map<string, RawWaterLog[]>();
  for (const log of logs) {
    if (typeof log.ml !== "number" || !Number.isFinite(log.ml) || !log.date) {
      continue;
    }
    const list = byDate.get(log.date);
    if (list) list.push(log);
    else byDate.set(log.date, [log]);
  }

  const result = new Map<string, DailyWater>();
  for (const [date, list] of byDate) {
    const ml = Math.round(list.reduce((sum, log) => sum + log.ml, 0));
    const times = list
      .map((log) => log.time)
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      )
      .sort();
    result.set(date, {
      date,
      ml,
      count: list.length,
      lastTime: times.length > 0 ? times[times.length - 1] : null,
    });
  }
  return result;
}
