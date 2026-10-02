import test from "node:test";
import assert from "node:assert/strict";
import { allTaskSubtasksDone, taskSubtaskChecks } from "../src/lib/task-schedule.ts";

const task = { id: "routine", repeat: "monthly", subtasks: [{ id: "one", title: "First" }, { id: "two", title: "Second" }] };

test("parent unlocks only when every current subtask is done", () => {
  assert.equal(allTaskSubtasksDone({ ...task, subtasks: undefined }, {}), true);
  assert.equal(allTaskSubtasksDone(task, {}), false);
  assert.equal(allTaskSubtasksDone(task, { one: true }), false);
  assert.equal(allTaskSubtasksDone(task, { one: true, two: true }), true);
  assert.equal(allTaskSubtasksDone(task, { one: false, two: true }), false);
  assert.equal(allTaskSubtasksDone({ ...task, subtasks: task.subtasks.slice(1) }, { two: true }), true);
});

test("daily and weekly subtask progress is isolated to each day", () => {
  const rows = [{ date: "2026-10-01", subtasks: { routine: { one: true, two: false } } }];
  for (const repeat of ["daily", "weekly"]) {
    const routine = { ...task, repeat, subtaskProgress: { date: "2026-10-01", since: "", completed: { one: true } } };
    assert.deepEqual(taskSubtaskChecks(routine, "2026-10-01", rows), { one: true, two: false });
    assert.deepEqual(taskSubtaskChecks(routine, "2026-10-02", rows), {});
  }
});

test("monthly and yearly progress carries until parent completion, then resets", () => {
  for (const repeat of ["monthly", "yearly"]) {
    const routine = { ...task, repeat, subtaskProgress: { date: "2026-10-01", since: "", completed: { one: true, two: false } } };
    assert.deepEqual(taskSubtaskChecks(routine, "2026-10-02", []), { one: true, two: false });
    assert.deepEqual(taskSubtaskChecks(routine, "2026-09-30", []), {});
    assert.deepEqual(taskSubtaskChecks({ ...routine, completedThrough: "2026-10-02" }, "2026-11-01", []), {});
    assert.deepEqual(taskSubtaskChecks(routine, "2026-10-02", [{ date: "2026-10-02", subtasks: { routine: { one: false, two: false } } }]), { one: false, two: false });
  }
});

test("legacy tasks and day records without subtasks remain supported", () => {
  assert.deepEqual(taskSubtaskChecks({ id: "legacy", repeat: "daily" }, "2026-10-01", [{ date: "2026-10-01" }]), {});
});
