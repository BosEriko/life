# Life Tracker

A private, single-user web app for logging daily health and well-being data and
watching it trend over time. It lives at `life.boseriko.com` and is meant to be
set as a browser homepage — open a tab, log the day, glance at the graphs.

Everything is one person's data behind their own login; there is no multi-tenant
layer, no sharing, and no public surface.

---

## What it does

- **Log a day in seconds.** One screen captures weight, blood pressure
  (systolic / diastolic, with posture and arm), water intake, a free-text note,
  and four yes/no habits (junk food, junk drink, bath, brush).
- **No save button.** Edits autosave 2 seconds after you stop typing, with a
  single status toast that moves through *Unsaved changes → Saving… → Saved*.
- **Any day, past or future.** `◀ / ▶ / Today` controls plus a date picker; the
  form always reflects what's already stored for the selected day.
- **See trends.** A line chart for weight, blood pressure, or water over a
  chosen window (7D / 30D / 90D / 1Y / All, or a custom date range).
- **See habits at a glance.** A GitHub-style contribution calendar, one row per
  habit, ~6 months wide, with a hover tooltip per day.
- **Rolling averages** for weight, blood pressure, and water over a
  configurable window.
- **Personal targets ("ideals").** Set min/max ranges per metric. Averages and
  the live log-entry inputs turn red with a warning icon when a value falls
  outside its range; blood-pressure fields also surface short, non-prescriptive
  guidance on nudging the number up or down.
- **Reusable water presets.** Name your bottles/glasses and their volume; those
  names replace the generic `+500 / +1000` quick-add buttons.
- **Export a PDF report.** A floating action button opens a range picker and
  generates a formatted report — summary stats plus a full day-by-day table.

---

## Tech stack

| Area        | Choice                                                           |
| ----------- | -------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, `src/`, Turbopack), React 19          |
| Language    | TypeScript (strict)                                            |
| UI          | Ant Design 6 + a custom sage-green theme (light/dark)         |
| Icons       | Font Awesome (solid) + Ant Design Icons                        |
| Charts      | `@ant-design/charts` (line charts)                            |
| PDF         | `jsPDF` + `jspdf-autotable`                                    |
| Backend     | Firebase — Email/Password Auth + Cloud Firestore              |
| Lint        | ESLint 9 / `eslint-config-next`                               |
| CI          | GitHub Actions (deploys Firestore rules)                      |

---

## Architecture

### Auth

- **Email/password only.** Dedicated `/login` and `/register` pages.
- **Client-side route guard.** A provider subscribes to
  `onAuthStateChanged`; a guard component redirects unauthenticated users to
  `/login` and authenticated users away from the auth pages. This is a UX gate,
  not the security boundary — that lives in Firestore rules.
- Firebase is initialised lazily so the SDK never runs during static
  prerendering.

### Data model

All documents are namespaced under the signed-in user:

| Collection / doc                     | Shape                                                          |
| ------------------------------------ | ------------------------------------------------------------ |
| `users/{uid}/dailies/{YYYY-MM-DD}`   | One doc per day. Doc **id is the local date**, so days sort chronologically. Fields: `weight`, `systolic`, `diastolic`, `bpTime`, `bpPosture`, `bpArm`, `water`, `notes`, `junkFood`, `junkDrink`, `bath`, `brushTeeth`, `updatedAt`. |
| `users/{uid}/ideals/current`         | Single doc. `{ min, max }` target range for `weight`, `systolic`, `diastolic`, `water`. |
| `users/{uid}/presets/{id}`           | Water presets: `{ name, ml, createdAt }`.                     |

- **Merge writes.** Editing a day patches its existing document, so a morning
  weigh-in and an afternoon blood-pressure reading land on the same record.
- **Per-field dirty tracking.** Only the fields actually touched in an editing
  session are written, so saving weight never overwrites a day's habit flags or
  notes. `bpTime` is stamped with the local time only when the BP numbers
  themselves change.
- **Local time.** The "today" key and all displayed times come from the
  browser clock, matching how the app is used.
- Each screen subscribes to Firestore in real time (`onSnapshot`), so the
  averages, calendar, chart, and recent list update the moment a day is saved.

### Security

- Firestore rules grant a signed-in user read and write access to **their own
  subtree only** — `match /users/{userId}/{document=**}` with
  `request.auth != null && request.auth.uid == userId` — and deny everything
  else (`match /{document=**} { allow read, write: if false; }`).
- `firestore.rules` is generated from `firestore.rules.template` (a plain copy,
  no secrets) and deployed via `firebase-tools` (auth token in `FIREBASE_TOKEN`)
  by a GitHub Action whenever the template changes on `main`.

### Front-end details worth noting

- **Theme.** A single sage-green accent, warm off-white in light mode and a
  green-tinted charcoal (never pure black) in dark mode. Defaults to light and
  ignores the OS setting; a header toggle switches modes and the choice is
  persisted to `localStorage`. Read through `useSyncExternalStore` so SSR and the
  first client render agree (no hydration mismatch).
- **Lazy loading.** The chart library and the PDF library are dynamically
  imported — the chart on mount (`ssr: false`), the PDF code only when the user
  clicks download — so neither is in the initial bundle.
- **Debounced autosave** with an unmount flush, a keyed Ant Design `message` for
  the save lifecycle, and preset quick-add buttons that feed the same debounce.
- **Contextual validation.** Inputs and average tiles read the "ideals" doc
  live; out-of-range values get `status="error"` plus a tooltip whose placement
  flips (above for high, below for low).
- **Responsive layout.** A three-column CSS grid (`auto-fit`, `minmax`) —
  log entry / stats + calendar / trends + recent — that collapses to two then
  one column as width shrinks, with no hard breakpoints.

---

## Scripts

| Command             | Purpose                                             |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Local dev server                                  |
| `npm run build`     | Production build                                  |
| `npm run lint`      | ESLint                                            |
| `npm run rules:build` | Copy `firestore.rules.template` to `firestore.rules` |

Environment: `NEXT_PUBLIC_FIREBASE_*` values in `.env.local` (client-side
Firebase config — not secret).
