import { createHash } from "node:crypto";
import { getAdminDb } from "@/lib/firebase-admin";

export async function resolveUidFromKey(key: string): Promise<string | null> {
  const trimmed = key.trim();
  if (!trimmed) return null;

  const hash = createHash("sha256").update(trimmed).digest("hex");
  const snap = await getAdminDb()
    .collectionGroup("mcpKeys")
    .where("hash", "==", hash)
    .limit(1)
    .get();

  return snap.empty ? null : (snap.docs[0].ref.parent.parent?.id ?? null);
}
