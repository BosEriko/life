import { FieldValue } from "firebase-admin/firestore";
import { adminFromRequest } from "@/lib/api-auth";
import { ADMIN_EMAIL } from "@/lib/admin";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(error: unknown, status = 500): Response {
  const message =
    error instanceof Error ? error.message : "Something went wrong.";
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const db = getAdminDb();
    const { users } = await getAdminAuth().listUsers(1000);

    const claudeRefs = users.map((user) => db.doc(`claudeAccess/${user.uid}`));
    const claudeSnaps = claudeRefs.length ? await db.getAll(...claudeRefs) : [];
    const claudeByUid = new Map(
      claudeSnaps.map((snap) => [snap.id, snap.get("enabled") === true]),
    );

    const adminRefs = users.map((user) => db.doc(`admins/${user.uid}`));
    const adminSnaps = adminRefs.length ? await db.getAll(...adminRefs) : [];
    const adminByUid = new Map(
      adminSnaps.map((snap) => [snap.id, snap.get("admin") === true]),
    );

    const rows = users
      .map((user) => ({
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        claudeEnabled: claudeByUid.get(user.uid) ?? false,
        isAdmin:
          user.email?.toLowerCase() === ADMIN_EMAIL ||
          (adminByUid.get(user.uid) ?? false),
        createdAt: user.metadata.creationTime ?? null,
      }))
      .sort((a, b) => {
        const aPinned = a.email?.toLowerCase() === ADMIN_EMAIL;
        const bPinned = b.email?.toLowerCase() === ADMIN_EMAIL;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return (a.email ?? a.uid).localeCompare(b.email ?? b.uid);
      });

    return Response.json({ users: rows });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  const admin = await adminFromRequest(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { uid?: unknown; enabled?: unknown; admin?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const uid = typeof body.uid === "string" ? body.uid : "";
  if (!uid) return Response.json({ error: "Missing uid" }, { status: 400 });

  try {
    const db = getAdminDb();
    const result: Record<string, unknown> = { uid };
    const writes: Promise<unknown>[] = [];

    if (typeof body.enabled === "boolean") {
      writes.push(
        db
          .doc(`claudeAccess/${uid}`)
          .set(
            { enabled: body.enabled, updatedAt: FieldValue.serverTimestamp() },
            { merge: true },
          ),
      );
      result.enabled = body.enabled;
    }

    if (typeof body.admin === "boolean") {
      const target = await getAdminAuth()
        .getUser(uid)
        .catch(() => null);
      if (
        target?.email?.toLowerCase() === ADMIN_EMAIL &&
        body.admin === false
      ) {
        return Response.json(
          { error: "The owner is always an admin." },
          { status: 400 },
        );
      }
      writes.push(
        db
          .doc(`admins/${uid}`)
          .set(
            { admin: body.admin, updatedAt: FieldValue.serverTimestamp() },
            { merge: true },
          ),
      );
      result.admin = body.admin;
    }

    if (writes.length === 0) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    await Promise.all(writes);
    return Response.json(result);
  } catch (error) {
    return fail(error);
  }
}
