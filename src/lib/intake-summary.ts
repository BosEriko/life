export type RawIntake = {
  date: string;
  kind: "food" | "drink";
  junk?: boolean | null;
  calories?: number | null;
  sodium?: number | null;
};

export type DailyIntake = {
  date: string;
  junkFood: boolean;
  junkDrink: boolean;
  calories: number;
  sodium: number;
  count: number;
};

export function dailyIntake(entries: RawIntake[]): Map<string, DailyIntake> {
  const result = new Map<string, DailyIntake>();
  for (const entry of entries) {
    if (!entry.date) continue;
    const day =
      result.get(entry.date) ??
      {
        date: entry.date,
        junkFood: false,
        junkDrink: false,
        calories: 0,
        sodium: 0,
        count: 0,
      };
    day.count += 1;
    if (typeof entry.calories === "number" && Number.isFinite(entry.calories)) {
      day.calories += entry.calories;
    }
    if (typeof entry.sodium === "number" && Number.isFinite(entry.sodium)) {
      day.sodium += entry.sodium;
    }
    if (entry.junk) {
      if (entry.kind === "food") day.junkFood = true;
      if (entry.kind === "drink") day.junkDrink = true;
    }
    result.set(entry.date, day);
  }
  return result;
}
