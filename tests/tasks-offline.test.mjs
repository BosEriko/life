import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { initializeApp, deleteApp } from "firebase/app";
import * as firestore from "firebase/firestore";
import { overdueTasks, pendingTaskDate } from "../src/lib/task-schedule.ts";

test("offline task creation, edits, per-day completion, undo and deletion self-echo", async () => {
  const app = initializeApp({ projectId: "demo-task-offline" }, "task-offline-test");
  const db = firestore.initializeFirestore(app, { localCache: firestore.memoryLocalCache() });
  await firestore.disableNetwork(db);
  const output = ts.transpileModule(fs.readFileSync("src/models/tasks.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInThisContext(`(function(exports, require) { ${output}\n})`)(exports, (name) => {
    if (name === "@/lib/firebase") return { getFirebaseDb: () => db };
    if (name === "firebase/firestore") return firestore;
    throw new Error(`Unexpected import: ${name}`);
  });
  const uid = "test-user";
  const updates = [];
  const days = [];
  const recent = [];
  const offTasks = exports.watchTaskSettings(uid, (rows) => updates.push(rows), (error) => { throw error; });
  const offDay = exports.watchTaskDay(uid, "2020-01-01", (row) => days.push(row), (error) => { throw error; });
  const offRecent = exports.watchTaskChecks(uid, "2026-01-01", (rows) => recent.push(rows), (error) => { throw error; });
  const waitFor = async (predicate) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.fail("Expected local snapshot did not arrive");
  };
  const pending = (promise) => promise.catch(() => {});
  try {
    await waitFor(() => updates.length && days.length && recent.length);
    let acknowledged = false;
    pending(exports.saveTask(uid, { id: "routine", title: "Original" }).then(() => { acknowledged = true; }));
    await waitFor(() => updates.at(-1)?.[0]?.title === "Original");
    assert.equal(acknowledged, false);
    pending(exports.saveTask(uid, { id: "routine", title: "Edited" }));
    await waitFor(() => updates.at(-1)?.[0]?.title === "Edited");
    pending(exports.setTaskChecked(uid, "2020-01-01", "routine", true));
    await waitFor(() => days.at(-1)?.completed.routine === true);
    pending(exports.setTaskChecked(uid, "2020-01-01", "routine", false));
    await waitFor(() => days.at(-1)?.completed.routine === false);
    pending(exports.setTaskChecked(uid, "2026-10-01", "routine", true));
    await waitFor(() => recent.at(-1)?.[0]?.completed.routine === true);
    const routine = { id: "routine", title: "Routine", startDate: "2026-01-01", repeat: "daily", interval: 1, time: "13:00" };
    assert.equal(overdueTasks([routine], recent.at(-1)[0].completed, new Date(2026, 9, 1, 15)).length, 0);
    assert.equal(recent.at(-1).length, 1);
    assert.equal(recent.at(-1)[0].date, "2026-10-01");
    pending(exports.setTaskChecked(uid, "2026-10-01", "routine", false));
    await waitFor(() => recent.at(-1)?.[0]?.completed.routine === false);
    assert.equal(overdueTasks([routine], recent.at(-1)[0].completed, new Date(2026, 9, 1, 15)).length, 1);
    const monthly = { ...routine, repeat: "monthly", monthlyMode: "date", monthDay: 1, interval: 1 };
    pending(exports.saveTask(uid, monthly));
    await waitFor(() => updates.at(-1)?.[0]?.repeat === "monthly");
    assert.equal(pendingTaskDate(updates.at(-1)[0], "2026-10-02"), "2026-10-01");
    pending(exports.setTaskChecked(uid, "2026-10-02", "routine", true, updates.at(-1)[0]));
    await waitFor(() => updates.at(-1)?.[0]?.completedThrough === "2026-10-02" && recent.at(-1)?.find((row) => row.date === "2026-10-02")?.completed.routine);
    assert.equal(pendingTaskDate(updates.at(-1)[0], "2026-10-03"), null);
    assert.equal(pendingTaskDate(updates.at(-1)[0], "2026-11-01"), "2026-11-01");
    pending(exports.setTaskChecked(uid, "2026-10-02", "routine", false, updates.at(-1)[0]));
    await waitFor(() => updates.at(-1)?.[0]?.completedThrough === "" && recent.at(-1)?.find((row) => row.date === "2026-10-02")?.completed.routine === false);
    assert.equal(pendingTaskDate(updates.at(-1)[0], "2026-10-03"), "2026-10-01");
    pending(exports.removeTask(uid, "routine"));
    await waitFor(() => updates.at(-1)?.length === 0);
  } finally {
    offTasks();
    offDay();
    offRecent();
    await firestore.terminate(db);
    await deleteApp(app);
  }
});
