import type { EatingWindow } from "@/models/ideals";

export function isOutsideEatingWindow(
  time: string,
  window: EatingWindow,
): boolean {
  const { start, end } = window;
  if (!start || !end || !time) return false;
  return start <= end
    ? time < start || time > end
    : time < start && time > end;
}
