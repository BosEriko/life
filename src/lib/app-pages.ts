import { readdirSync } from "node:fs";
import { join } from "node:path";

const PAGE_FILE = /^page\.(tsx|ts|jsx|js|mdx)$/;

export function listAppPages(appDir: string): string[] {
  const pages: string[] = [];
  const walk = (dir: string, segments: string[]) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && PAGE_FILE.test(entry.name))) pages.push(`/${segments.join("/")}`);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (name.startsWith("_") || name.startsWith("@") || name.startsWith("[") || (segments.length === 0 && name === "api")) continue;
      walk(join(dir, name), /^\(.+\)$/.test(name) ? segments : [...segments, name]);
    }
  };
  walk(appDir, []);
  return [...new Set(pages)].sort();
}
