export type RawBpReading = {
  date: string;
  systolic: number;
  diastolic: number;
  time?: string | null;
};

export type DailyBp = {
  date: string;
  systolic: number;
  diastolic: number;
  time: string | null;
  count: number;
};

function meanTime(times: string[]): string | null {
  const minutes = times
    .map((value) => {
      const [h, m] = value.split(":").map(Number);
      return h * 60 + m;
    })
    .filter((value) => Number.isFinite(value));
  if (minutes.length === 0) return null;
  const avg = Math.round(
    minutes.reduce((sum, value) => sum + value, 0) / minutes.length,
  );
  const hh = String(Math.floor(avg / 60)).padStart(2, "0");
  const mm = String(avg % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function dailyBpAverages(
  readings: RawBpReading[],
): Map<string, DailyBp> {
  const byDate = new Map<string, RawBpReading[]>();
  for (const reading of readings) {
    if (
      typeof reading.systolic !== "number" ||
      typeof reading.diastolic !== "number" ||
      !Number.isFinite(reading.systolic) ||
      !Number.isFinite(reading.diastolic) ||
      !reading.date
    ) {
      continue;
    }
    const list = byDate.get(reading.date);
    if (list) list.push(reading);
    else byDate.set(reading.date, [reading]);
  }

  const result = new Map<string, DailyBp>();
  for (const [date, list] of byDate) {
    const systolic = Math.round(
      list.reduce((sum, reading) => sum + reading.systolic, 0) / list.length,
    );
    const diastolic = Math.round(
      list.reduce((sum, reading) => sum + reading.diastolic, 0) / list.length,
    );
    const times = list
      .map((reading) => reading.time)
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );
    result.set(date, {
      date,
      systolic,
      diastolic,
      time: meanTime(times),
      count: list.length,
    });
  }
  return result;
}
