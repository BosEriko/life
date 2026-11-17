import { createHash, randomUUID } from "node:crypto";
import { FieldPath, FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { balanceChanges, CURRENCIES, toMinor, wiseRecord, type FinanceAccount, type FinanceRecord, type WiseActivity } from "@/lib/finance";

const API = "https://api.wise.com";
const FIRST_SYNC_DAYS = 365;
const OVERLAP_DAYS = 30;
const MAX_PAGES = 40;
const MIN_INTERVAL_MS = 60_000;

export type WiseConnection = {
  token: string;
  profileId: number;
  connectedAt: string;
  lastSyncedAt: string | null;
  lastSyncStartedAt: string | null;
  syncedThrough: string | null;
  lastError: string | null;
  accounts: Record<string, string>;
};

export class WiseError extends Error {}

const connectionRef = (uid: string) => getAdminDb().collection("wiseConnections").doc(uid);
const settingsRef = (uid: string) => getAdminDb().collection("users").doc(uid).collection("financeSettings").doc("current");

async function wiseGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (res.status === 401) throw new WiseError("Wise didn't accept this token. Create a new one and connect again.");
  if (res.status === 403) throw new WiseError("This Wise token isn't allowed to read your account activity.");
  if (!res.ok) throw new WiseError(`Wise returned an error (${res.status}). Try again later.`);
  return (await res.json()) as T;
}

export async function wiseProfileId(token: string) {
  const profiles = await wiseGet<{ id: number; type: string }[]>(token, "/v2/profiles");
  const profile = profiles.find((item) => item.type?.toLowerCase() === "personal") ?? profiles[0];
  if (!profile) throw new WiseError("No Wise profile was found for this token.");
  return profile.id;
}

export async function readWiseConnection(uid: string) {
  const snap = await connectionRef(uid).get();
  return snap.exists ? (snap.data() as WiseConnection) : null;
}

export async function saveWiseConnection(uid: string, token: string, profileId: number) {
  const existing = await readWiseConnection(uid);
  const connection: WiseConnection = {
    token,
    profileId,
    connectedAt: new Date().toISOString(),
    lastSyncedAt: null,
    lastSyncStartedAt: null,
    syncedThrough: existing?.profileId === profileId ? existing.syncedThrough : null,
    lastError: null,
    accounts: existing?.profileId === profileId ? existing.accounts : {},
  };
  await connectionRef(uid).set(connection);
}

export async function removeWiseConnection(uid: string) {
  const connection = await readWiseConnection(uid);
  if (!connection) return;
  const settings = (await settingsRef(uid).get()).data()?.accounts ?? {};
  const ids = Object.values(connection.accounts).filter((id) => settings[id]);
  if (ids.length > 0) {
    const [first, ...rest] = ids.flatMap((id) => [new FieldPath("accounts", id, "source"), null]);
    await settingsRef(uid).update(first as FieldPath, rest[0], ...rest.slice(1));
  }
  await connectionRef(uid).delete();
}

function dateIn(iso: string, timezone: string | null) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone ?? undefined, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function recordId(activityId: string) {
  return `wise-${createHash("sha256").update(activityId).digest("hex").slice(0, 32)}`;
}

async function fetchActivities(token: string, profileId: number, since: string) {
  const activities: WiseActivity[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ size: "100", since });
    if (cursor) params.set("nextCursor", cursor);
    const body = await wiseGet<{ cursor: string | null; activities: WiseActivity[] }>(token, `/v1/profiles/${profileId}/activities?${params}`);
    activities.push(...(body.activities ?? []));
    cursor = body.cursor ?? null;
    if (!cursor) break;
  }
  return activities;
}

async function commitInChunks(writes: ((batch: FirebaseFirestore.WriteBatch) => void)[]) {
  for (let index = 0; index < writes.length; index += 400) {
    const batch = getAdminDb().batch();
    for (const write of writes.slice(index, index + 400)) write(batch);
    await batch.commit();
  }
}

export type WiseSyncResult = { status: "synced"; added: number; updated: number; removed: number } | { status: "skipped" } | { status: "not-connected" };

export async function syncWise(uid: string, { force = false } = {}): Promise<WiseSyncResult> {
  const db = getAdminDb();
  const ref = connectionRef(uid);
  const now = new Date();
  const connection = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data() as WiseConnection;
    const recent = (value: string | null) => value != null && now.getTime() - new Date(value).getTime() < MIN_INTERVAL_MS;
    if (recent(data.lastSyncStartedAt) || (!force && recent(data.lastSyncedAt))) return "skip" as const;
    tx.update(ref, { lastSyncStartedAt: now.toISOString() });
    return data;
  });
  if (connection === null) return { status: "not-connected" };
  if (connection === "skip") return { status: "skipped" };

  try {
    const result = await runSync(uid, connection, now);
    await ref.update({ lastSyncedAt: new Date().toISOString(), lastSyncStartedAt: null, syncedThrough: now.toISOString(), lastError: null, accounts: result.accounts });
    return { status: "synced", added: result.added, updated: result.updated, removed: result.removed };
  } catch (error) {
    const message = error instanceof WiseError ? error.message : "Could not sync with Wise. It will try again next time.";
    await ref.update({ lastSyncStartedAt: null, lastError: message });
    throw new WiseError(message);
  }
}

async function runSync(uid: string, connection: WiseConnection, now: Date) {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const [balances, profileSnap, settingsSnap] = await Promise.all([
    wiseGet<{ currency: string; amount: { value: number } }[]>(connection.token, `/v4/profiles/${connection.profileId}/balances?types=STANDARD`),
    userRef.collection("profile").doc("current").get(),
    settingsRef(uid).get(),
  ]);
  const timezone = typeof profileSnap.get("timezone") === "string" ? (profileSnap.get("timezone") as string) : null;
  const existingAccounts = (settingsSnap.data()?.accounts ?? {}) as Record<string, FinanceAccount>;
  let nextOrder = Math.max(-1, ...Object.values(existingAccounts).map((account) => account.order ?? -1)) + 1;

  const accounts: Record<string, string> = { ...connection.accounts };
  const created: FinanceAccount[] = [];
  const live: Record<string, string> = {};
  const targets = new Map<string, number>();
  for (const balance of balances) {
    if (!CURRENCIES.includes(balance.currency)) continue;
    const mapped = accounts[balance.currency];
    const account = mapped ? existingAccounts[mapped] : undefined;
    if (mapped && account?.deletedAt) continue;
    const id = account ? mapped : randomUUID();
    if (!account) {
      created.push({ id, name: `Wise ${balance.currency}`, color: "#163300", type: "Bank account", initialMinor: 0, balanceMinor: 0, currency: balance.currency, excludeFromStatistics: false, provider: "Wise", order: nextOrder++, source: "wise" });
    }
    accounts[balance.currency] = id;
    live[balance.currency] = id;
    targets.set(id, toMinor(balance.amount.value, balance.currency));
  }

  const since = connection.syncedThrough
    ? new Date(new Date(connection.syncedThrough).getTime() - OVERLAP_DAYS * 86_400_000)
    : new Date(now.getTime() - FIRST_SYNC_DAYS * 86_400_000);
  const activities = await fetchActivities(connection.token, connection.profileId, since.toISOString());

  const planned = activities.map((activity) => {
    const id = recordId(activity.id);
    return { ref: userRef.collection("financeRecords").doc(id), next: wiseRecord(activity, live, dateIn(activity.createdOn, timezone), id) };
  }).filter((item) => item.next !== null);
  const existing = new Map<string, FinanceRecord>();
  for (let index = 0; index < planned.length; index += 100) {
    const refs: DocumentReference[] = planned.slice(index, index + 100).map((item) => item.ref);
    if (refs.length === 0) continue;
    for (const snap of await db.getAll(...refs)) if (snap.exists) existing.set(snap.id, { ...snap.data(), id: snap.id } as FinanceRecord);
  }

  const writes: ((batch: FirebaseFirestore.WriteBatch) => void)[] = [];
  let added = 0, updated = 0, removed = 0;
  for (const { ref, next } of planned) {
    const old = existing.get(ref.id);
    if (next === "remove") {
      if (old) { writes.push((batch) => batch.delete(ref)); removed += 1; }
      continue;
    }
    if (!next) continue;
    if (!old) { writes.push((batch) => batch.set(ref, next)); added += 1; continue; }
    if (old.accountId === next.accountId && (old.amountMinor !== next.amountMinor || old.type !== next.type)) {
      writes.push((batch) => batch.update(ref, { amountMinor: next.amountMinor, type: next.type }));
      updated += 1;
    }
  }
  await commitInChunks(writes);

  const settingsUpdates: Record<string, unknown> = { revision: FieldValue.increment(1) };
  for (const account of created) settingsUpdates[`accounts.${account.id}`] = account;
  for (const [id, target] of targets) {
    const [asSource, asDestination] = await Promise.all([
      userRef.collection("financeRecords").where("accountId", "==", id).get(),
      userRef.collection("financeRecords").where("destinationId", "==", id).get(),
    ]);
    const seen = new Set<string>();
    let changes = 0;
    for (const snap of [...asSource.docs, ...asDestination.docs]) {
      if (seen.has(snap.id)) continue;
      seen.add(snap.id);
      for (const [accountId, change] of balanceChanges({ ...snap.data(), id: snap.id } as FinanceRecord)) if (accountId === id) changes += change;
    }
    const isNew = created.some((account) => account.id === id);
    if (isNew) {
      settingsUpdates[`accounts.${id}`] = { ...(settingsUpdates[`accounts.${id}`] as FinanceAccount), initialMinor: target - changes, balanceMinor: target };
    } else {
      settingsUpdates[`accounts.${id}.initialMinor`] = target - changes;
      settingsUpdates[`accounts.${id}.balanceMinor`] = target;
      settingsUpdates[`accounts.${id}.source`] = "wise";
    }
  }
  await settingsRef(uid).set({}, { merge: true });
  await settingsRef(uid).update(settingsUpdates);
  return { accounts, added, updated, removed };
}
