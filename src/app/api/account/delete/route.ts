import { uidFromRequest } from "@/lib/api-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHALLENGE_TTL_MS = 60_000;

function challengeRef(uid: string) {
  return getAdminDb().collection("accountDeletions").doc(uid);
}

// Issue a 6-digit confirmation code, stored server-side with a 60s expiry.
export async function GET(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  await challengeRef(uid).set({ code, expiresAt, createdAt: Date.now() });

  return Response.json({ code, expiresIn: Math.round(CHALLENGE_TTL_MS / 1000) });
}

// Verify the code, then permanently delete the account and all its data.
export async function POST(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return Response.json(
      { ok: false, error: "Enter the 6-digit code." },
      { status: 400 },
    );
  }

  const ref = challengeRef(uid);
  const snap = await ref.get();
  const challenge = snap.data() as
    | { code?: string; expiresAt?: number }
    | undefined;

  if (!challenge?.code || !challenge.expiresAt) {
    return Response.json(
      { ok: false, error: "Start the deletion again." },
      { status: 400 },
    );
  }
  if (Date.now() > challenge.expiresAt) {
    await ref.delete().catch(() => {});
    return Response.json(
      { ok: false, error: "The code expired. Start over." },
      { status: 400 },
    );
  }
  if (code !== challenge.code) {
    return Response.json(
      { ok: false, error: "That code is not correct." },
      { status: 400 },
    );
  }

  try {
    const db = getAdminDb();
    await db.recursiveDelete(db.collection("users").doc(uid));
    await db.collection("claudeAccess").doc(uid).delete().catch(() => {});
    await getAdminAuth().deleteUser(uid);
    await ref.delete().catch(() => {});
    return Response.json({ ok: true });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "Could not delete the account. Try again.";
    return Response.json({ ok: false, error: detail }, { status: 500 });
  }
}
