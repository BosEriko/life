import type { User } from "firebase/auth";

export type ShareLink = {
  code: string;
  label: string | null;
  createdAt: number | null;
  expiresAt: number | null;
  maxUses: number | null;
  useCount: number;
  revoked: boolean;
};

export type CreateShareLinkInput = {
  label?: string | null;
  expiresInMs?: number | null;
  maxUses?: number | null;
};

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? `Request failed (${res.status}).`;
}

export async function listShareLinks(user: User): Promise<ShareLink[]> {
  const token = await user.getIdToken();
  const res = await fetch("/api/share", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await readError(res));
  return ((await res.json()) as { links: ShareLink[] }).links;
}

export async function createShareLink(
  user: User,
  input: CreateShareLinkInput,
): Promise<ShareLink> {
  const token = await user.getIdToken();
  const res = await fetch("/api/share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return ((await res.json()) as { link: ShareLink }).link;
}

export async function deleteShareLink(
  user: User,
  code: string,
): Promise<void> {
  const token = await user.getIdToken();
  const res = await fetch(`/api/share/${code}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await readError(res));
}

export function inviteUrl(code: string): string {
  if (typeof window === "undefined") return `/invite/${code}`;
  return `${window.location.origin}/invite/${code}`;
}

export function shareLinkStatus(
  link: ShareLink,
): "active" | "revoked" | "expired" | "exhausted" {
  if (link.revoked) return "revoked";
  if (link.expiresAt != null && Date.now() > link.expiresAt) return "expired";
  if (link.maxUses != null && link.useCount >= link.maxUses) return "exhausted";
  return "active";
}
