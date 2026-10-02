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

export function todoListId(todo: Todo, lists: TodoList[]): string {
  return lists.some((list) => list.id === todo.listId) ? todo.listId! : "inbox";
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
  return null;
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
    const listName = lists.find((list) => list.id === todo.listId)?.name ?? "Inbox";
    return !search || [todo.title, todo.description, listName, ...Object.values(todo.subtasks).map((subtask) => subtask.title)].some((value) => value.toLocaleLowerCase().includes(search));
  }).sort((a, b) => {
    if (options.view === "completed") return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
    if (options.sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    if (options.sort === "priority") return rank[b.priority] - rank[a.priority] || (a.dueDate ?? ACTIVE_TODO_DATE).localeCompare(b.dueDate ?? ACTIVE_TODO_DATE);
    return (a.dueDate ?? ACTIVE_TODO_DATE).localeCompare(b.dueDate ?? ACTIVE_TODO_DATE) || (a.dueTime ?? "23:59").localeCompare(b.dueTime ?? "23:59") || rank[b.priority] - rank[a.priority] || a.createdAt.localeCompare(b.createdAt);
  });
}
