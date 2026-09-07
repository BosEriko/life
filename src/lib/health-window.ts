import dayjs from "dayjs";
import { todayKey } from "@/models/dailies";

export const HEALTH_WINDOW_DAYS = 400;

export function healthWindowCutoff(): string {
  return dayjs(todayKey())
    .subtract(HEALTH_WINDOW_DAYS, "day")
    .format("YYYY-MM-DD");
}
