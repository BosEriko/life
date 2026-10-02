import dayjs from "dayjs";

export type TaskSubtask = { id: string; title: string };
export type SubtaskChecks = Record<string, boolean>;

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
  completedThrough?: string;
  previousCompletedThrough?: string;
  subtasks?: TaskSubtask[];
  subtaskProgress?: { date: string; since: string; completed: SubtaskChecks };
};

export function allTaskSubtasksDone(task: Task, completed: SubtaskChecks): boolean {
  return (task.subtasks ?? []).every((subtask) => completed[subtask.id] === true);
}

export function taskSubtaskChecks(task: Task, date: string, checks: { date: string; subtasks?: Record<string, SubtaskChecks> }[]): SubtaskChecks {
  const saved = checks.find((row) => row.date === date)?.subtasks?.[task.id];
  if (saved) return saved;
  const progress = task.subtaskProgress;
  return (task.repeat === "monthly" || task.repeat === "yearly") && progress && progress.date <= date && progress.since === (task.completedThrough ?? "") ? progress.completed : {};
}

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

export function pendingTaskDate(task: Task, date: string, checks: { date: string; completed: Record<string, boolean> }[] = []): string | null {
  if (task.repeat === "daily" || task.repeat === "weekly") return taskOccursOn(task, date) ? date : null;
  const completion = [task.completedThrough, task.previousCompletedThrough, ...checks.filter((row) => row.completed[task.id]).map((row) => row.date)]
    .filter((value): value is string => !!value && value <= date).sort().at(-1);
  let day = dayjs(date).startOf("day");
  const start = dayjs(task.startDate).startOf("day");
  if (!day.isValid() || !start.isValid() || task.interval < 1) return null;
  while (!day.isBefore(start)) {
    const key = day.format("YYYY-MM-DD");
    if (completion && key <= completion) return null;
    if (taskOccursOn(task, key)) return key;
    day = day.subtract(1, "day");
  }
  return null;
}

export function overdueTasks(tasks: Task[], completed: Record<string, boolean>, now: Date, checks: { date: string; completed: Record<string, boolean> }[] = []): Task[] {
  const local = dayjs(now);
  const date = local.format("YYYY-MM-DD");
  const time = local.format("HH:mm");
  return tasks
    .filter((task) => {
      const pending = pendingTaskDate(task, date, checks);
      return pending && (pending < date || task.time <= time) && !completed[task.id];
    })
    .sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
}

export function formatTaskTime(time: string) {
  return dayjs(`2000-01-01T${time}`).format("h:mm A");
}
