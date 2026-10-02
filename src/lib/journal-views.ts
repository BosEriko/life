import dayjs from "dayjs";

const TASK_VIEWS = ["today", "daily", "monthly", "weekly", "yearly"] as const;

export function taskViewFromQuery(value: string | null): typeof TASK_VIEWS[number] {
  return TASK_VIEWS.find((view) => view === value) ?? "today";
}

export function noteDateFromQuery(value: string | null, today: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).format("YYYY-MM-DD") === value ? value : today;
}

export function journalViewUrl(pathname: string, search: string, view: string, hash = ""): string {
  const params = new URLSearchParams(search);
  params.set("view", view);
  return `${pathname}?${params.toString()}${hash}`;
}
