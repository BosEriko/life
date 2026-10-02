import test from "node:test";
import assert from "node:assert/strict";
import { taskViewFromQuery, noteDateFromQuery, journalViewUrl } from "../src/lib/journal-views.ts";

test("tasks support each sidebar view and default invalid values to today", () => {
  for (const view of ["today", "daily", "monthly", "weekly", "yearly"]) assert.equal(taskViewFromQuery(view), view);
  for (const view of [null, "", "unknown", "Weekly"]) assert.equal(taskViewFromQuery(view), "today");
});

test("notes support date views and reject malformed or impossible dates", () => {
  const today = "2026-10-02";
  assert.equal(noteDateFromQuery("2026-07-28", today), "2026-07-28");
  assert.equal(noteDateFromQuery("2024-02-29", today), "2024-02-29");
  for (const view of [null, "today", "", "invalid", "2026-02-29", "2026-13-01", "2026-7-28"]) assert.equal(noteDateFromQuery(view, today), today);
});

test("view links preserve unrelated parameters and fragments while replacing the view", () => {
  assert.equal(journalViewUrl("/journal/tasks", "", "weekly"), "/journal/tasks?view=weekly");
  assert.equal(journalViewUrl("/journal/notes", "view=today&filter=one", "2026-07-28", "#notes"), "/journal/notes?view=2026-07-28&filter=one#notes");
  assert.equal(journalViewUrl("/journal/tasks", "view=weekly", "today"), "/journal/tasks?view=today");
});
