import dayjs from "dayjs";

export type Task = {
  id: string;
  title: string;
  description: string;
  time: string;
  startDate: string;
  repeat: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  weekdays: number[];
  monthlyMode: "date" | "weekday";
  monthDay: number;
  ordinal: number;
  weekday: number;
  month: number;
};

export function taskOccursOn(task: Task, date: string): boolean {
  const day = dayjs(date).startOf("day");
  const start = dayjs(task.startDate).startOf("day");
  if (!day.isValid() || !start.isValid() || day.isBefore(start) || task.interval < 1) return false;
  if (task.repeat === "daily") return day.diff(start, "day") % task.interval === 0;
  if (task.repeat === "weekly") {
    const monday = (value: typeof day) => value.subtract((value.day() + 6) % 7, "day");
    return monday(day).diff(monday(start), "week") % task.interval === 0 && task.weekdays.includes(day.day());
  }
  if (task.repeat === "yearly") {
    return (day.year() - start.year()) % task.interval === 0 && day.month() === task.month && day.date() === Math.min(task.monthDay, day.daysInMonth());
  }
  const months = (day.year() - start.year()) * 12 + day.month() - start.month();
  if (months % task.interval !== 0) return false;
  if (task.monthlyMode === "date") return day.date() === Math.min(task.monthDay, day.daysInMonth());
  if (day.day() !== task.weekday) return false;
  return task.ordinal === -1
    ? day.add(7, "day").month() !== day.month()
    : Math.ceil(day.date() / 7) === task.ordinal;
}

export function overdueTasks(tasks: Task[], completed: Record<string, boolean>, now: Date): Task[] {
  const local = dayjs(now);
  const date = local.format("YYYY-MM-DD");
  const time = local.format("HH:mm");
  return tasks
    .filter((task) => taskOccursOn(task, date) && task.time <= time && !completed[task.id])
    .sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
}

export function formatTaskTime(time: string) {
  return dayjs(`2000-01-01T${time}`).format("h:mm A");
}
