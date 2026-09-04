import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export type McpKeyMeta = { prefix: string; createdAt: string | null };

function keyDoc(uid: string) {
  return doc(getFirebaseDb(), "users", uid, "apiKeys", "current");
}

function randomKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `lt_${hex}`;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export async function generateMcpKey(uid: string): Promise<string> {
  const key = randomKey();
  const hash = await sha256Hex(key);
  await setDoc(keyDoc(uid), {
    hash,
    prefix: key.slice(0, 10),
    createdAt: serverTimestamp(),
  });
  return key;
}

export function watchMcpKey(
  uid: string,
  onChange: (meta: McpKeyMeta | null) => void,
  onError?: (error: unknown) => void,
) {
  return onSnapshot(
    keyDoc(uid),
    (snapshot) => {
      const data = snapshot.data();
      if (!data?.hash) {
        onChange(null);
        return;
      }
      const created = data.createdAt;
      onChange({
        prefix: (data.prefix as string | undefined) ?? "lt_",
        createdAt:
          created && typeof created.toDate === "function"
            ? created.toDate().toISOString()
            : null,
      });
    },
    onError,
  );
}
