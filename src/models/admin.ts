import type { User } from "firebase/auth";

export type AdminUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  claudeEnabled: boolean;
  createdAt: string | null;
};

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? `Request failed (${res.status}).`;
}

export async function listAdminUsers(user: User): Promise<AdminUser[]> {
  const token = await user.getIdToken();
  const res = await fetch("/api/admin/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await readError(res));
  return ((await res.json()) as { users: AdminUser[] }).users;
}

export async function setUserClaudeAccess(
  user: User,
  uid: string,
  enabled: boolean,
): Promise<void> {
  const token = await user.getIdToken();
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ uid, enabled }),
  });
  if (!res.ok) throw new Error(await readError(res));
}
