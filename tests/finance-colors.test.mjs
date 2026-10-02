import test from "node:test";
import assert from "node:assert/strict";
import { accountTextColor } from "../src/lib/finance.ts";

test("account text color uses perceptual (APCA) contrast", () => {
  for (const color of ["#43a047", "#1e88e5", "#e53935", "#326647", "#8e24aa", "#000000"]) assert.equal(accountTextColor(color), "#ffffff", color);
  for (const color of ["#fbc02d", "#ffffff", "#00e5ff", "#d4e157"]) assert.equal(accountTextColor(color), "#172019", color);
});
