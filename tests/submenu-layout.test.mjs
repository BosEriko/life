import test from "node:test";
import assert from "node:assert/strict";
import { splitTabs } from "../src/lib/submenu-layout.ts";

const widths = [80, 80, 80, 80, 80, 80];

test("every tab shows when they all fit, with no More menu", () => {
  assert.deepEqual(splitTabs([80, 80, 80, 80], 60, 350, 10, 0), { visible: [0, 1, 2, 3], overflow: [] });
});

test("tabs that do not fit move under More, keeping their order", () => {
  assert.deepEqual(splitTabs(widths, 60, 340, 10, 0), { visible: [0, 1, 2], overflow: [3, 4, 5] });
});

test("the current tab stays visible even when it would normally be under More", () => {
  assert.deepEqual(splitTabs(widths, 60, 340, 10, 5), { visible: [0, 1, 5], overflow: [2, 3, 4] });
});

test("tabs after the first one that does not fit stay under More so the order is predictable", () => {
  assert.deepEqual(splitTabs([80, 200, 40, 40], 60, 300, 10, 0), { visible: [0], overflow: [1, 2, 3] });
});

test("a very narrow row still keeps the current tab, with everything else under More", () => {
  assert.deepEqual(splitTabs(widths, 60, 100, 10, 2), { visible: [2], overflow: [0, 1, 3, 4, 5] });
});

test("no current tab in this section just fills from the start", () => {
  assert.deepEqual(splitTabs(widths, 60, 340, 10, -1), { visible: [0, 1, 2], overflow: [3, 4, 5] });
});
