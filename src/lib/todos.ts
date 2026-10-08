import dayjs from "dayjs";

export const ACTIVE_TODO_DATE = "9999-12-31";
export const TODO_PRIORITIES = ["none", "low", "medium", "high"] as const;
export type TodoPriority = (typeof TODO_PRIORITIES)[number];
export type TodoStatus = "todo" | "doing" | "done";
export type TodoSubtask = { id: string; title: string; done: boolean };
export type TodoList = { id: string; name: string };
export type Todo = {
  id: string;
  date: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  listId: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate: string | null;
  dueTime: string | null;
  subtasks: Record<string, TodoSubtask>;
  link?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
export type TodoView = "all" | "today" | "upcoming" | "overdue" | "completed";
export type TodoSort = "due" | "priority" | "newest";
export function todoViewFromQuery(value: string | null): TodoView {
  return value === "today" || value === "upcoming" || value === "overdue" || value === "completed" ? value : "all";
}
export type TodoColumn = "upcoming" | "todo" | "doing" | "done";

export function isTodoPastDate(todo: Todo, now: Date): boolean {
  return !!todo.dueDate && todo.dueDate < dayjs(now).format("YYYY-MM-DD");
}

export function todoColumn(todo: Todo, now: Date): TodoColumn {
  if (todo.status === "done" || todo.completedAt) return "done";
  if (todo.status === "doing") return "doing";
  return todo.dueDate && todo.dueDate > dayjs(now).format("YYYY-MM-DD") ? "upcoming" : "todo";
}

export function todoMovePatch(todo: Todo, column: TodoColumn, now: Date) {
  const today = dayjs(now).format("YYYY-MM-DD");
  return {
    status: column === "done" ? "done" as const : column === "doing" ? "doing" as const : "todo" as const,
    dueDate: column === "upcoming" ? dayjs(now).add(1, "day").format("YYYY-MM-DD") : column === "todo" && todo.dueDate && todo.dueDate > today ? today : todo.dueDate,
    date: column === "done" ? today : ACTIVE_TODO_DATE,
    completedAt: column === "done" ? now.toISOString() : null,
    updatedAt: now.toISOString(),
  };
}

export const ARCHIVE_LIST_ID = "archive";

export function todoListId(todo: Todo, lists: TodoList[]): string {
  if (todo.listId === ARCHIVE_LIST_ID) return ARCHIVE_LIST_ID;
  return lists.some((list) => list.id === todo.listId) ? todo.listId! : "inbox";
}

export function todoListName(todo: Todo, lists: TodoList[]): string {
  const id = todoListId(todo, lists);
  if (id === ARCHIVE_LIST_ID) return "Archive";
  return lists.find((list) => list.id === id)?.name ?? "Inbox";
}

export function fixedListOptions(lists: TodoList[]) {
  return [{ value: "inbox", label: "Inbox" }, ...lists.map((list) => ({ value: list.id, label: list.name })), { value: ARCHIVE_LIST_ID, label: "Archive" }];
}

export function isKnownList(listId: string, lists: TodoList[]): boolean {
  return listId === "inbox" || listId === ARCHIVE_LIST_ID || lists.some((list) => list.id === listId);
}

export function isTodoOverdue(todo: Todo, now: Date): boolean {
  if (todo.status === "done" || !todo.dueDate) return false;
  const today = dayjs(now).format("YYYY-MM-DD");
  return todo.dueDate < today || (todo.dueDate === today && !!todo.dueTime && todo.dueTime <= dayjs(now).format("HH:mm"));
}

export function todoValidation(todo: Todo): string | null {
  if (!todo.title.trim() || todo.title.trim().length > 120) return "Enter a title of up to 120 characters.";
  if (todo.description.length > 2000) return "Keep the description within 2,000 characters.";
  if (!TODO_PRIORITIES.includes(todo.priority)) return "Choose a valid priority.";
  if (!["todo", "doing", "done"].includes(todo.status)) return "Choose a valid status.";
  if (todo.dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(todo.dueDate) || dayjs(todo.dueDate).format("YYYY-MM-DD") !== todo.dueDate)) return "Choose a valid due date.";
  if (todo.dueTime && (!todo.dueDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(todo.dueTime))) return "Choose a due date and a valid time.";
  const subtasks = Object.values(todo.subtasks);
  if (subtasks.length > 50) return "Use up to 50 subtasks per to-do.";
  if (subtasks.some((subtask) => !subtask.title.trim() || subtask.title.trim().length > 120)) return "Each subtask needs a title of up to 120 characters.";
  if (todo.link && normalizeLinkUrl(todo.link) !== todo.link) return "Enter a valid web address for the link.";
  return null;
}

export function normalizeLinkUrl(input: string): string | null {
  const value = input.trim();
  if (!value || /\s/.test(value)) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function todoLink(todo: { link?: unknown; links?: unknown }): string | null {
  if (typeof todo.link === "string" && normalizeLinkUrl(todo.link) === todo.link) return todo.link;
  const legacy = Array.isArray(todo.links) ? (todo.links[0] as { url?: unknown } | undefined) : undefined;
  return typeof legacy?.url === "string" && normalizeLinkUrl(legacy.url) === legacy.url ? legacy.url : null;
}

export function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function filterTodos(todos: Todo[], lists: TodoList[], options: {
  view: TodoView;
  listId: string;
  search: string;
  priority: TodoPriority | "all";
  status: "all" | "todo" | "doing";
  sort: TodoSort;
  now: Date;
}): Todo[] {
  const today = dayjs(options.now).format("YYYY-MM-DD");
  const search = options.search.trim().toLocaleLowerCase();
  const rank = { none: 0, low: 1, medium: 2, high: 3 };
  return todos.filter((todo) => {
    if ((todo.status === "done") !== (options.view === "completed")) return false;
    if (options.listId !== "all" && todoListId(todo, lists) !== options.listId) return false;
    if (options.priority !== "all" && todo.priority !== options.priority) return false;
    if (options.view !== "completed" && options.status !== "all" && todo.status !== options.status) return false;
    if (options.view === "today" && (!todo.dueDate || todo.dueDate > today)) return false;
    if (options.view === "upcoming" && (!todo.dueDate || todo.dueDate <= today)) return false;
    if (options.view === "overdue" && !isTodoOverdue(todo, options.now)) return false;
    const listName = todoListName(todo, lists);
    return !search || [todo.title, todo.description, listName, ...Object.values(todo.subtasks).map((subtask) => subtask.title)].some((value) => value.toLocaleLowerCase().includes(search));
  }).sort((a, b) => {
    if (options.view === "completed") return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
    if (options.sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    if (options.sort === "priority") return rank[b.priority] - rank[a.priority] || (a.dueDate ?? ACTIVE_TODO_DATE).localeCompare(b.dueDate ?? ACTIVE_TODO_DATE);
    return (a.dueDate ?? ACTIVE_TODO_DATE).localeCompare(b.dueDate ?? ACTIVE_TODO_DATE) || (a.dueTime ?? "23:59").localeCompare(b.dueTime ?? "23:59") || rank[b.priority] - rank[a.priority] || a.createdAt.localeCompare(b.createdAt);
  });
}
