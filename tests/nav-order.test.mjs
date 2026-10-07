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
  assert.deepEqual(readNavOrder(["journal", "settings", "journal", "health"]), ["journal", "health", "finance", "records"]);
});

test("menu items not in a saved order are added at the end", () => {
  assert.deepEqual(readNavOrder(["records"]), ["records", "health", "journal", "finance"]);
});

test("items are sorted to match the order", () => {
  const items = NAV_IDS.map((id) => ({ id }));
  assert.deepEqual(orderBy(items, ["records", "finance", "journal", "health"]).map((item) => item.id), ["records", "finance", "journal", "health"]);
});

test("sub-page order defaults per section and ignores pages from other sections", () => {
  assert.deepEqual(readSubmenuOrder(undefined), { journal: ["notes", "tasks", "todo", "board"], finance: ["dashboard", "accounts", "records", "analytics"], records: ["database", "summary"] });
  const order = readSubmenuOrder({ records: ["summary", "dashboard", "database"], finance: ["analytics", "notes"], journal: "board" });
  assert.deepEqual(order.records, ["summary", "database"]);
  assert.deepEqual(order.finance, ["analytics", "dashboard", "accounts", "records"]);
  assert.deepEqual(order.journal, ["notes", "tasks", "todo", "board"]);
});

test("the shared order reader keeps the same rules for any list", () => {
  assert.deepEqual(readOrder(["b", "x", "b"], ["a", "b", "c"]), ["b", "a", "c"]);
});
