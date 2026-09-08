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

function toMinutes(hhmm: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Which side of the eating window a time falls on. The non-window hours form a
 * gap; a time in the half right after the window closed counts as "after"
 * (late), the half right before it opens counts as "before" (early). Returns
 * null when the time is inside the window or the window is unset.
 */
export function eatingWindowSide(
  time: string,
  window: EatingWindow,
): "before" | "after" | null {
  const { start, end } = window;
  if (!start || !end || !time) return null;
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  const timeMin = toMinutes(time);
  if (startMin == null || endMin == null || timeMin == null) return null;

  const gap = (startMin - endMin + 1440) % 1440;
  const afterEnd = (timeMin - endMin + 1440) % 1440;
  if (afterEnd === 0 || afterEnd >= gap) return null;
  return afterEnd * 2 <= gap ? "after" : "before";
}
