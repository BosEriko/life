import test from "node:test";
import assert from "node:assert/strict";
import { NAV_IDS, orderBy, readNavOrder, readOrder, readSubmenuOrder } from "../src/lib/nav-order.ts";

test("missing or malformed menu order falls back to the default", () => {
  assert.deepEqual(readNavOrder(undefined), [...NAV_IDS]);
  assert.deepEqual(readNavOrder("finance"), [...NAV_IDS]);
  assert.deepEqual(readNavOrder([1, null, {}]), [...NAV_IDS]);
});

test("a saved order is kept, with unknown and duplicate entries dropped", () => {
  assert.deepEqual(readNavOrder(["finance", "health", "records", "journal"]), ["finance", "health", "records", "journal"]);
  assert.deepEqual(readNavOrder(["journal", "settings", "journal", "health"]), ["journal", "finance", "records", "health"]);
});

test("menu items missing from a saved order return next to their default neighbor", () => {
  assert.deepEqual(readNavOrder(["records"]), ["health", "journal", "finance", "records"]);
  assert.deepEqual(readNavOrder(["finance", "records", "health"]), ["finance", "records", "health", "journal"]);
});

test("items are sorted to match the order", () => {
  const items = NAV_IDS.map((id) => ({ id }));
  assert.deepEqual(orderBy(items, ["records", "finance", "journal", "health"]).map((item) => item.id), ["records", "finance", "journal", "health"]);
});

test("sub-page order defaults per section and ignores pages from other sections", () => {
  assert.deepEqual(readSubmenuOrder(undefined), { journal: ["notes", "tasks", "todo", "board"], finance: ["dashboard", "accounts", "records", "debts", "analytics"], records: ["database", "summary"] });
  const order = readSubmenuOrder({ records: ["summary", "dashboard", "database"], finance: ["analytics", "notes"], journal: "board" });
  assert.deepEqual(order.records, ["summary", "database"]);
  assert.deepEqual(order.finance, ["dashboard", "accounts", "records", "debts", "analytics"]);
  assert.deepEqual(order.journal, ["notes", "tasks", "todo", "board"]);
});

test("the shared order reader keeps the same rules for any list", () => {
  assert.deepEqual(readOrder(["b", "x", "b"], ["a", "b", "c"]), ["a", "b", "c"]);
  assert.deepEqual(readOrder(["c", "a"], ["a", "b", "c"]), ["c", "a", "b"]);
});

test("a new Debts page lands after Records in saved Finance orders", () => {
  assert.deepEqual(readSubmenuOrder({ finance: ["dashboard", "accounts", "records", "analytics"] }).finance, ["dashboard", "accounts", "records", "debts", "analytics"]);
  assert.deepEqual(readSubmenuOrder({ finance: ["analytics", "records", "dashboard", "accounts"] }).finance, ["analytics", "records", "debts", "dashboard", "accounts"]);
  assert.deepEqual(readSubmenuOrder({ finance: ["debts", "dashboard", "accounts", "records", "analytics"] }).finance, ["debts", "dashboard", "accounts", "records", "analytics"]);
});
