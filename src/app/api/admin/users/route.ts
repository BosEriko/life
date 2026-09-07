import { FieldValue } from "firebase-admin/firestore";
import { adminFromRequest } from "@/lib/api-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const db = getAdminDb();
  const { users } = await getAdminAuth().listUsers(1000);

  const refs = users.map((user) => db.doc(`claudeAccess/${user.uid}`));
  const snaps = refs.length ? await db.getAll(...refs) : [];
  const enabledByUid = new Map(
    snaps.map((snap) => [snap.id, snap.get("enabled") === true]),
  );

  const rows = users
    .map((user) => ({
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      claudeEnabled: enabledByUid.get(user.uid) ?? false,
      createdAt: user.metadata.creationTime ?? null,
    }))
    .sort((a, b) => (a.email ?? a.uid).localeCompare(b.email ?? b.uid));

  return Response.json({ users: rows });
}

export async function POST(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { uid?: unknown; enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const uid = typeof body.uid === "string" ? body.uid : "";
  if (!uid) return Response.json({ error: "Missing uid" }, { status: 400 });
  const enabled = body.enabled === true;

  await getAdminDb()
    .doc(`claudeAccess/${uid}`)
    .set(
      { enabled, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

  return Response.json({ uid, enabled });
}
