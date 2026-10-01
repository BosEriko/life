import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVE_TODO_DATE, filterTodos, isTodoOverdue, todoListId, todoValidation } from "../src/lib/todos.ts";

const base = {
  id: "one", date: ACTIVE_TODO_DATE, title: "Plan trip", description: "Book tickets",
  listId: "personal", priority: "medium", status: "todo", dueDate: "2026-10-02", dueTime: null,
  subtasks: { step: { id: "step", title: "Compare flights", done: false } },
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "", completedAt: null,
};
const lists = [{ id: "personal", name: "Personal" }];
const options = { view: "all", listId: "all", search: "", priority: "all", status: "all", sort: "due", now: new Date(2026, 9, 2, 15) };

test("due dates, local time and completion determine overdue status", () => {
  assert.equal(isTodoOverdue(base, options.now), false);
  assert.equal(isTodoOverdue({ ...base, dueTime: "14:00" }, options.now), true);
  assert.equal(isTodoOverdue({ ...base, dueTime: "16:00" }, options.now), false);
  assert.equal(isTodoOverdue({ ...base, dueDate: "2026-10-01" }, options.now), true);
  assert.equal(isTodoOverdue({ ...base, dueDate: null }, options.now), false);
  assert.equal(isTodoOverdue({ ...base, status: "done", dueTime: "14:00" }, options.now), false);
});

test("views separate today, upcoming, overdue and completed", () => {
  const items = [base, { ...base, id: "past", dueDate: "2026-10-01" }, { ...base, id: "future", dueDate: "2026-10-03" }, { ...base, id: "undated", dueDate: null }, { ...base, id: "done", status: "done", date: "2026-10-02", completedAt: "2026-10-02T12:00:00Z" }];
  const ids = (view) => filterTodos(items, lists, { ...options, view }).map((item) => item.id);
  assert.deepEqual(ids("today"), ["past", "one"]);
  assert.deepEqual(ids("upcoming"), ["future"]);
  assert.deepEqual(ids("overdue"), ["past"]);
  assert.deepEqual(ids("completed"), ["done"]);
  assert.equal(ids("all").length, 4);
});

test("list deletion moves orphaned to-dos to Inbox without losing them", () => {
  assert.equal(todoListId(base, lists), "personal");
  assert.equal(todoListId(base, []), "inbox");
  assert.equal(filterTodos([base], [], { ...options, listId: "inbox" }).length, 1);
});

test("search includes descriptions, lists and subtasks and combines with filters", () => {
  for (const search of ["tickets", "PERSONAL", "flights"]) assert.equal(filterTodos([base], lists, { ...options, search }).length, 1);
  assert.equal(filterTodos([base], lists, { ...options, priority: "high" }).length, 0);
  assert.equal(filterTodos([base], lists, { ...options, status: "doing" }).length, 0);
  assert.equal(filterTodos([base], lists, { ...options, listId: "other" }).length, 0);
});

test("sorting is stable and puts undated to-dos last", () => {
  const items = [base, { ...base, id: "high", dueDate: null, priority: "high" }, { ...base, id: "new", createdAt: "2026-10-02T00:00:00Z" }];
  assert.deepEqual(filterTodos(items, lists, options).map((item) => item.id), ["one", "new", "high"]);
  assert.equal(filterTodos(items, lists, { ...options, sort: "priority" })[0].id, "high");
  assert.equal(filterTodos(items, lists, { ...options, sort: "newest" })[0].id, "new");
});

test("validation rejects empty titles, invalid dates, times without dates and empty subtasks", () => {
  assert.equal(todoValidation(base), null);
  for (const patch of [{ title: " " }, { dueDate: "2026-02-30" }, { dueDate: null, dueTime: "13:00" }, { dueTime: "25:00" }, { subtasks: { step: { id: "step", title: "", done: false } } }]) assert.notEqual(todoValidation({ ...base, ...patch }), null);
});
