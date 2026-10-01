import test from "node:test";
import assert from "node:assert/strict";
import { taskOccursOn, overdueTasks } from "../src/lib/task-schedule.ts";

const base = { id: "test", title: "Routine", description: "", time: "09:00", startDate: "2026-01-05", repeat: "daily", interval: 1, weekdays: [1, 4], monthlyMode: "date", monthDay: 1, ordinal: 1, weekday: 1, month: 0 };

test("daily intervals start on the anchor date and never before it", () => {
  const task = { ...base, interval: 3 };
  assert.equal(taskOccursOn(task, "2026-01-04"), false);
  assert.equal(taskOccursOn(task, "2026-01-05"), true);
  assert.equal(taskOccursOn(task, "2026-01-07"), false);
  assert.equal(taskOccursOn(task, "2026-01-08"), true);
});

test("alternate weeks include only Monday and Thursday", () => {
  const task = { ...base, repeat: "weekly", interval: 2 };
  for (const date of ["2026-01-05", "2026-01-08", "2026-01-19", "2026-01-22"]) assert.equal(taskOccursOn(task, date), true, date);
  for (const date of ["2026-01-06", "2026-01-12", "2026-01-15"]) assert.equal(taskOccursOn(task, date), false, date);
});

test("monthly dates clamp at month end and respect month intervals", () => {
  const task = { ...base, repeat: "monthly", monthDay: 31 };
  for (const date of ["2026-01-31", "2026-02-28", "2026-04-30"]) assert.equal(taskOccursOn(task, date), true, date);
  assert.equal(taskOccursOn({ ...task, interval: 2 }, "2026-02-28"), false);
  assert.equal(taskOccursOn({ ...task, interval: 2 }, "2026-03-31"), true);
});

test("first and last weekday schedules", () => {
  const task = { ...base, repeat: "monthly", monthlyMode: "weekday" };
  assert.equal(taskOccursOn(task, "2026-02-02"), true);
  assert.equal(taskOccursOn(task, "2026-02-09"), false);
  assert.equal(taskOccursOn({ ...task, ordinal: -1 }, "2026-02-23"), true);
  assert.equal(taskOccursOn({ ...task, ordinal: -1 }, "2026-02-16"), false);
});

test("yearly recurrence handles leap days and multi-year intervals", () => {
  const task = { ...base, startDate: "2024-02-29", repeat: "yearly", month: 1, monthDay: 29 };
  assert.equal(taskOccursOn(task, "2025-02-28"), true);
  assert.equal(taskOccursOn(task, "2028-02-29"), true);
  assert.equal(taskOccursOn(task, "2028-02-28"), false);
  assert.equal(taskOccursOn({ ...task, interval: 2 }, "2025-02-28"), false);
  assert.equal(taskOccursOn({ ...task, interval: 2 }, "2026-02-28"), true);
});

test("reminders group overdue tasks and exclude completed and future tasks", () => {
  const tasks = [
    { ...base, id: "two", time: "14:00" },
    { ...base, id: "one", time: "13:00" },
    { ...base, id: "four", time: "16:00" },
  ];
  const now = new Date(2026, 9, 1, 15, 0);
  assert.deepEqual(overdueTasks(tasks, {}, now).map((task) => task.id), ["one", "two"]);
  assert.deepEqual(overdueTasks(tasks, { two: true }, now).map((task) => task.id), ["one"]);
  assert.deepEqual(overdueTasks(tasks, { one: true, two: true }, now), []);
  assert.deepEqual(overdueTasks(tasks, { two: false }, now).map((task) => task.id), ["one", "two"]);
});

test("reminders respect local time, day boundaries and recurrence", () => {
  const task = { ...base, time: "13:00" };
  assert.equal(overdueTasks([task], {}, new Date(2026, 9, 1, 12, 59)).length, 0);
  assert.equal(overdueTasks([task], {}, new Date(2026, 9, 1, 13, 0)).length, 1);
  assert.equal(overdueTasks([task], {}, new Date(2026, 9, 2, 0, 0)).length, 0);
  assert.equal(overdueTasks([{ ...task, repeat: "weekly", weekdays: [1] }], {}, new Date(2026, 9, 1, 15, 0)).length, 0);
  assert.equal(overdueTasks([{ ...task, startDate: "2026-10-02" }], {}, new Date(2026, 9, 1, 15, 0)).length, 0);
});
