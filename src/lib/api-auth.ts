import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { ADMIN_EMAIL } from "@/lib/admin";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

export async function uidFromRequest(request: Request): Promise<string | null> {
  const token = bearerToken(request);
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function adminFromRequest(
  request: Request,
): Promise<string | null> {
  const token = bearerToken(request);
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const email = decoded.email?.toLowerCase();
    if (!email || email !== ADMIN_EMAIL) return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function isAdminUid(uid: string): Promise<boolean> {
  try {
    const snap = await getAdminDb().doc(`admins/${uid}`).get();
    return snap.get("admin") === true;
  } catch {
    return false;
  }
}

export async function adminRoleFromRequest(
  request: Request,
): Promise<string | null> {
  const token = bearerToken(request);
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (decoded.email?.toLowerCase() === ADMIN_EMAIL) return decoded.uid;
    if (await isAdminUid(decoded.uid)) return decoded.uid;
    return null;
  } catch {
    return null;
  }
}
