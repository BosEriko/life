import test from "node:test";
import assert from "node:assert/strict";
import { labelValidation, recordLabels, sortLabels } from "../src/lib/finance-labels.ts";

const trip = { id: "trip", name: "Trip", color: "#F44336", order: 1 };
const work = { id: "work", name: "Work", color: "#536DFE", order: 0 };

test("labels sort by order and resolve ids, skipping deleted ones", () => {
  assert.deepEqual(sortLabels([trip, work]).map((label) => label.id), ["work", "trip"]);
  assert.deepEqual(recordLabels([trip, work], ["trip", "gone", "work"]).map((label) => label.name), ["Trip", "Work"]);
});

test("label validation requires a unique name and a hex color", () => {
  assert.equal(labelValidation({ ...trip, name: "Vacation" }, [trip, work]), null);
  assert.match(labelValidation({ ...trip, name: " work " }, [trip, work]), /already exists/);
  assert.notEqual(labelValidation({ ...trip, name: " " }, [trip]), null);
  assert.notEqual(labelValidation({ ...trip, color: "red" }, [trip]), null);
});
