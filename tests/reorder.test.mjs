import test from "node:test";
import assert from "node:assert/strict";
import { mergeSubsetOrder } from "../src/lib/reorder.ts";
import { sortAccounts } from "../src/lib/finance.ts";

test("reordering a filtered subset keeps the hidden accounts in place", () => {
  assert.deepEqual(mergeSubsetOrder(["a", "b", "c", "d"], ["c", "a"]), ["c", "b", "a", "d"]);
  assert.deepEqual(mergeSubsetOrder(["a", "b", "c"], ["c", "b", "a"]), ["c", "b", "a"]);
  assert.deepEqual(mergeSubsetOrder(["a", "b"], []), ["a", "b"]);
});

test("accounts sort by saved order, then name for unordered ones", () => {
  const sorted = sortAccounts([{ id: "1", name: "Zed" }, { id: "2", name: "Amy", order: 1 }, { id: "3", name: "Bob" }, { id: "4", name: "Cal", order: 0 }]);
  assert.deepEqual(sorted.map((account) => account.id), ["4", "2", "3", "1"]);
});
