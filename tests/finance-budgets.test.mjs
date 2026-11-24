import test from "node:test";
import assert from "node:assert/strict";
import { budgetMatches, budgetPeriodBounds, budgetProgress, budgetRecords, budgetValidation, daysInclusive } from "../src/lib/finance-budgets.ts";

const food = { id: "b", name: "Food", color: "#F44336", icon: "utensils", amountMinor: 210000, currency: "PHP", period: "weekly", categoryIds: ["food"], accountIds: [], labels: [], fixed: false, order: 0 };
const scope = { categoryIdsOf: (category) => category === "groceries" ? ["groceries", "food"] : [category], defaultAccountIds: new Set(["cash"]) };
const record = { type: "expense", currency: "PHP", accountId: "cash", category: "groceries", labels: [], date: "2026-11-23" };

test("period bounds follow calendar boundaries with Monday weeks", () => {
  assert.deepEqual(budgetPeriodBounds("daily", "2026-11-24"), { start: "2026-11-24", end: "2026-11-24" });
  assert.deepEqual(budgetPeriodBounds("weekly", "2026-11-24"), { start: "2026-11-23", end: "2026-11-29" });
  assert.deepEqual(budgetPeriodBounds("weekly", "2026-11-29"), { start: "2026-11-23", end: "2026-11-29" });
  assert.deepEqual(budgetPeriodBounds("weekly", "2026-11-24", -1), { start: "2026-11-16", end: "2026-11-22" });
  assert.deepEqual(budgetPeriodBounds("monthly", "2026-02-10"), { start: "2026-02-01", end: "2026-02-28" });
  assert.deepEqual(budgetPeriodBounds("monthly", "2026-01-10", -1), { start: "2025-12-01", end: "2025-12-31" });
  assert.deepEqual(budgetPeriodBounds("yearly", "2026-11-24", -1), { start: "2025-01-01", end: "2025-12-31" });
  assert.equal(daysInclusive("2026-11-23", "2026-11-29"), 7);
});

test("matching requires expense, currency, category, account and label filters", () => {
  assert.equal(budgetMatches(food, record, scope), true);
  for (const patch of [{ type: "income" }, { currency: "USD" }, { category: "shopping" }, { accountId: "excluded" }]) assert.equal(budgetMatches(food, { ...record, ...patch }, scope), false);
  assert.equal(budgetMatches({ ...food, accountIds: ["excluded"] }, { ...record, accountId: "excluded" }, scope), true);
  assert.equal(budgetMatches({ ...food, categoryIds: [] }, { ...record, category: "shopping" }, scope), true);
  assert.equal(budgetMatches({ ...food, labels: ["Trip"] }, record, scope), false);
  assert.equal(budgetMatches({ ...food, labels: ["Trip"] }, { ...record, labels: ["Trip", "Lunch"] }, scope), true);
  assert.equal(budgetRecords(food, [record, { ...record, date: "2026-11-30" }], "2026-11-23", "2026-11-29", scope).length, 1);
});

test("daily allowance divides what is left by days left including today, rounded down", () => {
  assert.equal(budgetProgress(food, 0, "2026-11-23", "2026-11-29", "2026-11-23", 100).dailyAllowanceMinor, 30000);
  const day1 = budgetProgress(food, 100000, "2026-11-23", "2026-11-29", "2026-11-23", 100);
  assert.equal(day1.dailyAllowanceMinor, 15700);
  assert.equal(day1.expectedMinor, 30000);
  assert.equal(day1.projectedMinor, 700000);
  assert.equal(day1.status, "at-risk");
  assert.equal(day1.early, true);
  assert.equal(budgetProgress(food, 100000, "2026-11-23", "2026-11-29", "2026-11-24", 100).dailyAllowanceMinor, 18300);
  assert.equal(budgetProgress(food, 190000, "2026-11-23", "2026-11-29", "2026-11-29", 100).dailyAllowanceMinor, 20000);
  const over = budgetProgress(food, 230000, "2026-11-23", "2026-11-29", "2026-11-25", 100);
  assert.equal(over.status, "over");
  assert.equal(over.dailyAllowanceMinor, 0);
  assert.equal(over.leftMinor, -20000);
});

test("status is on track within pace, skips pace for fixed and daily budgets, and finishes past periods", () => {
  assert.equal(budgetProgress(food, 50000, "2026-11-23", "2026-11-29", "2026-11-25", 100).status, "on-track");
  assert.equal(budgetProgress({ ...food, fixed: true }, 100000, "2026-11-23", "2026-11-29", "2026-11-23", 100).status, "on-track");
  assert.equal(budgetProgress({ ...food, period: "daily" }, 100000, "2026-11-23", "2026-11-23", "2026-11-23", 100).paced, false);
  assert.equal(budgetProgress(food, 100000, "2026-11-16", "2026-11-22", "2026-11-24", 100).status, "under");
  assert.equal(budgetProgress(food, 300000, "2026-11-16", "2026-11-22", "2026-11-24", 100).status, "over");
});

test("validation checks fields and account currencies", () => {
  const accounts = [{ id: "cash", currency: "PHP", type: "Cash" }, { id: "usd", currency: "USD", type: "Cash" }, { id: "mom", currency: "PHP", type: "Debt" }];
  assert.equal(budgetValidation(food, accounts), null);
  for (const patch of [{ name: " " }, { amountMinor: 0 }, { period: "hourly" }, { color: "red" }, { accountIds: ["usd"] }, { accountIds: ["mom"] }, { accountIds: ["missing"] }]) assert.notEqual(budgetValidation({ ...food, ...patch }, accounts), null);
});
