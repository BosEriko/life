import type { User } from "firebase/auth";

export async function requestAccountDeletion(
  user: User,
): Promise<{ code: string; expiresIn: number }> {
  const token = await user.getIdToken();
  const res = await fetch("/api/account/delete", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => ({}))) as {
    code?: string;
    expiresIn?: number;
    error?: string;
  };
  if (!res.ok || !data.code) {
    throw new Error(data.error ?? "Could not start account deletion.");
  }
  return { code: data.code, expiresIn: data.expiresIn ?? 60 };
}

export async function confirmAccountDeletion(
  user: User,
  code: string,
): Promise<void> {
  const token = await user.getIdToken();
  const res = await fetch("/api/account/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok || data.ok !== true) {
    throw new Error(data.error ?? "Could not delete the account.");
  }
}
