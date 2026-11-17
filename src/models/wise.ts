import type { User } from "firebase/auth";

export type WiseStatus =
  | { connected: false }
  | { connected: true; connectedAt: string; lastSyncedAt: string | null; lastError: string | null; links: Record<string, string>; balances?: { currency: string; amountMinor: number }[] };

export const WISE_TOKEN_URL = "https://wise.com/your-account/integrations-and-tools/api-tokens";

async function call(user: User, path: string, init: RequestInit = {}) {
  const token = await user.getIdToken();
  const res = await fetch(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status}).`);
  return body;
}

export async function getWiseStatus(user: User, withBalances = false) {
  return (await call(user, `/api/integrations/wise${withBalances ? "?balances=1" : ""}`)) as WiseStatus;
}

export async function linkWiseAccount(user: User, accountId: string, currency: string | null) {
  await call(user, "/api/integrations/wise/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, currency }) });
}

export async function connectWise(user: User, token: string) {
  return (await call(user, "/api/integrations/wise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })) as WiseStatus;
}

export async function disconnectWise(user: User) {
  await call(user, "/api/integrations/wise", { method: "DELETE" });
}

export async function syncWiseNow(user: User, force = false) {
  return (await call(user, `/api/integrations/wise/sync${force ? "?force=1" : ""}`, { method: "POST" })) as { status: string; added?: number; updated?: number; removed?: number };
}

let lastAutoSync = 0;

export function autoSyncWise(user: User) {
  if (Date.now() - lastAutoSync < 60_000) return null;
  lastAutoSync = Date.now();
  return syncWiseNow(user);
}
