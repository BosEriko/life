import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listAppPages } from "../src/lib/app-pages.ts";

test("app pages drop route groups and skip dynamic, private, parallel and api folders", () => {
  const root = mkdtempSync(join(tmpdir(), "app-pages-"));
  const page = (...segments) => {
    mkdirSync(join(root, ...segments), { recursive: true });
    writeFileSync(join(root, ...segments, "page.tsx"), "");
  };
  try {
    page("(app)");
    page("(app)", "finance", "records");
    page("(marketing)", "about");
    page("login");
    page("s", "[code]");
    page("_drafts", "hidden");
    page("@modal", "photo");
    page("api", "docs");
    mkdirSync(join(root, "empty"));
    writeFileSync(join(root, "layout.tsx"), "");
    assert.deepEqual(listAppPages(root), ["/", "/about", "/finance/records", "/login"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the real app lists its static pages and leaves out the share-code page", () => {
  const pages = listAppPages(join(import.meta.dirname, "..", "src", "app"));
  for (const path of ["/", "/login", "/register", "/finance/records", "/finance/analytics", "/journal/notes", "/records/summary"]) {
    assert.ok(pages.includes(path), `${path} should be listed`);
  }
  assert.ok(!pages.some((path) => path.startsWith("/s") && path !== "/share"));
  assert.ok(!pages.some((path) => path.startsWith("/api")));
});
