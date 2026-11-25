import test from "node:test";
import assert from "node:assert/strict";
import { accountTextColor } from "../src/lib/finance.ts";

test("account text color uses perceptual (APCA) contrast", () => {
  for (const color of ["#43a047", "#1e88e5", "#e53935", "#326647", "#8e24aa", "#000000"]) assert.equal(accountTextColor(color), "#ffffff", color);
  for (const color of ["#fbc02d", "#ffffff", "#00e5ff", "#d4e157"]) assert.equal(accountTextColor(color), "#172019", color);
});

test("budget surfaces soften and deepen colors until text reaches APCA Lc 70", async () => {
  const { readableContrast, surfaceColor } = await import("../src/lib/finance.ts");
  for (const color of ["#F44336", "#4FC3F7", "#FFA726", "#78909C", "#AA00FF", "#64DD17", "#536DFE", "#00BFA5", "#FF4081", "#FBC02D", "#9E9E9E", "#FFFF00", "#00FFFF", "#808080"]) {
    const surface = surfaceColor(color);
    assert.match(surface, /^#[0-9A-F]{6}$/, color);
    assert.ok(readableContrast(surface) >= 70, `${color} → ${surface} Lc ${readableContrast(surface)}`);
  }
  assert.equal(readableContrast("#00BFA5") < 60, true);
  assert.equal(surfaceColor("bad"), "bad");
});
