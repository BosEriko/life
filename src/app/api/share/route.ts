import { randomBytes } from "node:crypto";
import { uidFromRequest } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 8;

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return out;
}

function serializeLink(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    code: id,
    label: (data.label as string | undefined) ?? null,
    createdAt: (data.createdAt as number | undefined) ?? null,
    expiresAt: (data.expiresAt as number | undefined) ?? null,
    maxUses: (data.maxUses as number | undefined) ?? null,
    useCount: (data.useCount as number | undefined) ?? 0,
    revoked: (data.revoked as boolean | undefined) ?? false,
  };
}

function collection() {
  return getAdminDb().collection("shareLinks");
}

export async function GET(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await collection().where("uid", "==", uid).get();
  const links = snap.docs
    .map((doc) => serializeLink(doc.id, doc.data()))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return Response.json({ links });
}

export async function POST(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { label?: unknown; expiresInMs?: unknown; maxUses?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim().slice(0, 60)
      : null;
  const expiresInMs =
    typeof body.expiresInMs === "number" && body.expiresInMs > 0
      ? body.expiresInMs
      : null;
  const maxUses =
    typeof body.maxUses === "number" && body.maxUses > 0
      ? Math.floor(body.maxUses)
      : null;

  const col = collection();
  let code = generateCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await col.doc(code).get();
    if (!existing.exists) break;
    code = generateCode();
  }

  const now = Date.now();
  const payload = {
    uid,
    label,
    createdAt: now,
    expiresAt: expiresInMs != null ? now + expiresInMs : null,
    maxUses,
    useCount: 0,
    revoked: false,
  };
  await col.doc(code).set(payload);

  return Response.json({ link: serializeLink(code, payload) });
}
