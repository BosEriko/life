import test from "node:test";
import assert from "node:assert/strict";
import { categoryDeleteBlocker, categoryTree, categoryValidation, DEFAULT_CATEGORIES, DELETED_CATEGORY_ID, MISSING_CATEGORY_ID, resetCategories, resolveCategory } from "../src/lib/finance-categories.ts";
import { wiseRecord } from "../src/lib/finance.ts";

test("defaults have 11 main categories, unique ids and locked Deleted category under Others", () => {
  assert.equal(DEFAULT_CATEGORIES.filter((category) => category.parentId === null).length, 11);
  assert.equal(new Set(DEFAULT_CATEGORIES.map((category) => category.id)).size, DEFAULT_CATEGORIES.length);
  assert.equal(resolveCategory(DEFAULT_CATEGORIES, DELETED_CATEGORY_ID).parentId, "others");
  assert.equal(resolveCategory(DEFAULT_CATEGORIES, MISSING_CATEGORY_ID).name, "Missing");
  for (const sub of DEFAULT_CATEGORIES.filter((category) => category.parentId)) assert.equal(sub.color, resolveCategory(DEFAULT_CATEGORIES, sub.parentId).color);
});

test("unknown category ids resolve to Deleted category", () => {
  assert.equal(resolveCategory(DEFAULT_CATEGORIES, "gone").id, DELETED_CATEGORY_ID);
  assert.equal(resolveCategory([], "gone").id, DELETED_CATEGORY_ID);
});

test("tree lists each main followed by its subcategories", () => {
  const rows = categoryTree(DEFAULT_CATEGORIES);
  assert.deepEqual(rows.slice(0, 4).map(({ category, depth }) => [category.name, depth]), [["Food & Drinks", 0], ["Bar, cafe", 1], ["Restaurant, fast-food", 1], ["Groceries", 1]]);
  assert.equal(rows.length, DEFAULT_CATEGORIES.length);
});

test("delete is blocked for locked categories and mains with subcategories", () => {
  assert.match(categoryDeleteBlocker(DELETED_CATEGORY_ID, DEFAULT_CATEGORIES), /locked/);
  assert.match(categoryDeleteBlocker("food-and-drinks", DEFAULT_CATEGORIES), /subcategories/);
  assert.equal(categoryDeleteBlocker("food-and-drinks--groceries", DEFAULT_CATEGORIES), null);
  const empty = DEFAULT_CATEGORIES.filter((category) => category.parentId !== "food-and-drinks");
  assert.equal(categoryDeleteBlocker("food-and-drinks", empty), null);
});

test("validation enforces two levels, unique sibling names and locks", () => {
  const groceries = resolveCategory(DEFAULT_CATEGORIES, "food-and-drinks--groceries");
  assert.equal(categoryValidation({ ...groceries, name: "Supermarket" }, DEFAULT_CATEGORIES), null);
  assert.match(categoryValidation({ ...groceries, name: "bar, CAFE" }, DEFAULT_CATEGORIES), /already exists/);
  assert.match(categoryValidation({ ...groceries, parentId: "food-and-drinks--bar-cafe" }, DEFAULT_CATEGORIES), /main category/);
  assert.match(categoryValidation({ ...resolveCategory(DEFAULT_CATEGORIES, "shopping"), parentId: "housing" }, DEFAULT_CATEGORIES), /subcategories/);
  assert.match(categoryValidation({ ...resolveCategory(DEFAULT_CATEGORIES, DELETED_CATEGORY_ID), name: "Trash" }, DEFAULT_CATEGORIES), /locked/);
  assert.match(categoryValidation({ ...groceries, color: "red" }, DEFAULT_CATEGORIES), /color/);
});

test("reset keeps ids of categories matching a default by name and parent", () => {
  const current = [
    { id: "custom-food", name: "food & drinks", color: "#000000", icon: "tag", parentId: null, order: 0 },
    { id: "custom-groceries", name: "Groceries", color: "#000000", icon: "tag", parentId: "custom-food", order: 0 },
    { id: "food-and-drinks--bar-cafe", name: "Coffee", color: "#000000", icon: "tag", parentId: "custom-food", order: 1 },
    { id: "mine", name: "Side hustle", color: "#000000", icon: "tag", parentId: null, order: 1 },
  ];
  let n = 0;
  const reset = resetCategories(current, () => `new-${++n}`);
  assert.equal(reset.length, DEFAULT_CATEGORIES.length);
  const byName = (name) => reset.find((category) => category.name === name);
  assert.equal(byName("Food & Drinks").id, "custom-food");
  assert.equal(byName("Food & Drinks").color, "#F44336");
  assert.equal(byName("Groceries").id, "custom-groceries");
  assert.equal(byName("Groceries").parentId, "custom-food");
  assert.equal(byName("Bar, cafe").id, "new-1");
  assert.equal(byName("Shopping").id, "shopping");
  assert.equal(byName("Deleted category").id, DELETED_CATEGORY_ID);
  assert.ok(!reset.some((category) => category.id === "mine"));
});

test("Wise imports land in Others › Missing", () => {
  const record = wiseRecord({ id: "A1", type: "CARD_PAYMENT", title: "Shop", primaryAmount: "<negative>10 PHP</negative>", status: "COMPLETED", createdOn: "2026-11-16T04:30:00Z" }, { PHP: "wise-php" }, "2026-11-16", "wise-1");
  assert.equal(resolveCategory(DEFAULT_CATEGORIES, record.category).id, MISSING_CATEGORY_ID);
});
