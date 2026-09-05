import type { DailyInput } from "@/models/dailies";

export type OutboxItem = {
  date: string;
  input: DailyInput;
  baseUpdatedAtMs: number | null;
  queuedAtMs: number;
};

type OutboxMap = Record<string, OutboxItem>;

function storageKey(uid: string): string {
  return `life-outbox:${uid}`;
}

export function readOutbox(uid: string): OutboxMap {
  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    if (!raw) return {};
    return JSON.parse(raw) as OutboxMap;
  } catch {
    return {};
  }
}

function writeOutbox(uid: string, outbox: OutboxMap) {
  try {
    window.localStorage.setItem(storageKey(uid), JSON.stringify(outbox));
  } catch {
    // best-effort; if storage is unavailable there's nowhere else to keep this
  }
}

export function getOutboxItem(uid: string, date: string): OutboxItem | null {
  return readOutbox(uid)[date] ?? null;
}

export function listOutboxItems(uid: string): OutboxItem[] {
  return Object.values(readOutbox(uid));
}

export function writeOutboxItem(
  uid: string,
  date: string,
  input: DailyInput,
  baseUpdatedAtMs: number | null,
) {
  const outbox = readOutbox(uid);
  const existing = outbox[date];
  outbox[date] = {
    date,
    input: { ...existing?.input, ...input },
    baseUpdatedAtMs: existing ? existing.baseUpdatedAtMs : baseUpdatedAtMs,
    queuedAtMs: Date.now(),
  };
  writeOutbox(uid, outbox);
}

export function removeOutboxItem(uid: string, date: string) {
  const outbox = readOutbox(uid);
  if (!(date in outbox)) return;
  delete outbox[date];
  writeOutbox(uid, outbox);
}
