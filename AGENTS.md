<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Regression checklist — confirm before finishing any change

Four capabilities are load-bearing and break silently. After **any** change that touches
data models, Firestore queries, providers/context, components that read health data, the
report/PDF code, the MCP route, or shared UI, verify all four still hold. Say plainly which
you actually exercised and which you could only reason through (most need a browser).

Always run `npm run lint`, `npx tsc --noEmit`, and `rm -rf .next && npm run build` — and
confirm the build still lists `/` and `/summary` as static (`○`), nothing regressed to `ƒ`.

## 1. PDF report (`src/components/report-modal.tsx`)
- Generates for every range (7 / 30 / 90 / 365 / All) and every field-selector combination.
- Trend charts (weight, water, BP) on their own page with real multi-tick axes, oldest date
  left / newest right; the day-by-day table stays on page 1; the "Generated …" header and
  the clickable "Generate your own at https://life.boseriko.com/" footer appear on every
  page.
- Its data comes from the shared health provider + `useHealthHistory`; "All" / "1Y" must
  pull the deep-history top-up, not just the rolling window.

## 2. MCP (`src/app/api/mcp/[key]/route.ts`)
- `initialize`, `search`, `fetch`, `get_entries`, `get_intake`, `get_notes` all still work,
  and the export still exposes every data type — dailies, bp, water, intake (incl. `name`
  and `nutritionSource`), notes.
- `src/lib/export-data.ts` is the shared shape; keep MCP and the PDF in sync with it.
- This route uses `firebase-admin` with its own windowed `where("date", …)` queries and is
  independent of the client provider — a client-side refactor does not cover it.

## 3. Offline
- Writes stay fire-and-forget with `.catch()` for a toast; never `await` a write before
  updating the UI.
- The UI reflects the user's own writes purely through live `onSnapshot` self-echo — there
  is no outbox / optimistic-merge layer. Every surface the user can add/edit/delete must
  have a live listener covering that document, including days outside the rolling window
  (that is what the per-day listeners in `src/components/use-day-records.ts` are for).
- `persistentLocalCache` in `src/lib/firebase.ts` stays enabled. `navigator.onLine` only
  changes toast wording. One-shot `getDocs` is display-only (history, PDF) — never put an
  editable surface behind it.

## 4. Responsive
- No horizontal page scroll at any width; wide content (tables, charts, heatmap) scrolls
  inside its own `overflow-x` container.
- `Grid.useBreakpoint()` `screens.md` is `undefined` on first render / SSR — branch with
  `=== true` / `=== false` / `!== true`, never a bare truthy check.
- Spot-check the mobile bottom nav, the FAB circle menu, modals (they cap height and scroll
  their body on small screens), and the habit heatmap (13 weeks mobile / 26 desktop).
