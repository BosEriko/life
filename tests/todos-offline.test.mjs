import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import dayjs from "dayjs";
import { initializeApp, deleteApp } from "firebase/app";
import * as firestore from "firebase/firestore";
import * as todos from "../src/lib/todos.ts";

test("to-do and list lifecycle self-echo offline, including old unfinished and archived records", async () => {
  const app = initializeApp({ projectId: "demo-todos-offline" }, "todos-offline-test");
  const db = firestore.initializeFirestore(app, { localCache: firestore.memoryLocalCache() });
  await firestore.disableNetwork(db);
  const output = ts.transpileModule(fs.readFileSync("src/models/users/todos.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const models = {};
  vm.runInThisContext(`(function(exports, require) { ${output}\n})`)(models, (name) => {
    if (name === "@/lib/firebase") return { getFirebaseDb: () => db };
    if (name === "@/lib/todos") return todos;
    if (name === "firebase/firestore") return firestore;
    if (name === "dayjs") return dayjs;
    throw new Error(`Unexpected import: ${name}`);
  });
  const live = [];
  const lists = [];
  const older = [];
  const failures = [];
  const fail = (error) => failures.push(error);
  const off = [models.watchTodos("user", "2026-01-01", (rows) => live.push(rows), fail), models.watchTodoSettings("user", (rows) => lists.push(rows), fail), models.watchTodosForDate("user", "2020-01-01", (rows) => older.push(rows), fail)];
  const waitFor = async (predicate) => {
    for (let i = 0; i < 200; i++) {
      if (failures.length) throw failures[0];
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.fail("Expected offline snapshot did not arrive");
  };
  const pending = (promise) => promise.catch(() => {});
  const item = { id: "first", date: todos.ACTIVE_TODO_DATE, title: "Original", description: "Details", listId: "project", priority: "high", status: "todo", dueDate: "2026-10-02", dueTime: "13:00", subtasks: { step: { id: "step", title: "First step", done: false } }, createdAt: "2020-01-01T00:00:00Z", updatedAt: "", completedAt: null };
  const current = () => live.at(-1)?.find((row) => row.id === "first");
  try {
    await waitFor(() => live.length && lists.length && older.length);
    let acknowledged = false;
    pending(models.saveTodo("user", item).then(() => { acknowledged = true; }));
    await waitFor(() => current()?.title === "Original");
    assert.equal(acknowledged, false);
    assert.equal(current().createdAt, "2020-01-01T00:00:00Z");
    pending(models.saveTodoList("user", { id: "project", name: "Work" }));
    await waitFor(() => lists.at(-1)?.[0]?.name === "Work");
    pending(models.saveTodoList("user", { id: "project", name: "Personal" }));
    await waitFor(() => lists.at(-1)?.[0]?.name === "Personal");
    pending(models.setTodoSubtask("user", "first", "step", true));
    await waitFor(() => current()?.subtasks.step.done === true);
    assert.equal(current().subtasks.step.title, "First step");
    pending(models.setTodoStatus("user", "first", "doing"));
    await waitFor(() => current()?.status === "doing");
    pending(models.saveTodo("user", { ...current(), title: "Edited", subtasks: {} }));
    await waitFor(() => current()?.title === "Edited");
    assert.deepEqual(current().subtasks, {});
    pending(models.completeTodo("user", current()));
    await waitFor(() => current()?.status === "done");
    assert.equal(current().title, "Edited");
    assert.equal(current().date, dayjs().format("YYYY-MM-DD"));
    pending(models.restoreTodo("user", "first"));
    await waitFor(() => current()?.status === "todo");
    assert.equal(current().date, todos.ACTIVE_TODO_DATE);
    pending(models.deleteTodoList("user", "project"));
    await waitFor(() => lists.at(-1)?.length === 0);
    assert.equal(todos.todoListId(current(), lists.at(-1)), "inbox");
    for (const column of ["upcoming", "todo", "doing", "done", "upcoming"]) {
      pending(models.moveTodo("user", current(), column));
      await waitFor(() => todos.todoColumn(current(), new Date()) === column);
      assert.equal(current().title, "Edited");
      assert.equal(current().date, column === "done" ? dayjs().format("YYYY-MM-DD") : todos.ACTIVE_TODO_DATE);
    }
    pending(models.saveTodo("user", { ...item, id: "archived", status: "done", date: "2020-01-01", completedAt: "2020-01-01T13:00:00Z" }));
    await waitFor(() => older.at(-1)?.length === 1);
    assert.equal(live.at(-1).some((row) => row.id === "archived"), false);
    pending(models.moveTodo("user", older.at(-1)[0], "doing"));
    await waitFor(() => older.at(-1)?.length === 0 && live.at(-1)?.some((row) => row.id === "archived" && row.status === "doing" && row.completedAt === null));
    pending(models.deleteTodo("user", "archived"));
    pending(models.deleteTodo("user", "first"));
    await waitFor(() => live.at(-1)?.length === 0);
  } finally {
    off.forEach((unsubscribe) => unsubscribe());
    await firestore.terminate(db);
    await deleteApp(app);
  }
});
