import { uidFromRequest } from "@/lib/api-auth";
import { linkWiseAccount, WiseError } from "@/lib/wise-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { accountId?: unknown; currency?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.accountId !== "string" || !body.accountId) return Response.json({ error: "Choose an account." }, { status: 400 });
  const currency = typeof body.currency === "string" ? body.currency : null;

  try {
    await linkWiseAccount(uid, body.accountId, currency);
  } catch (error) {
    return Response.json({ error: error instanceof WiseError ? error.message : "Could not update the Wise link." }, { status: 400 });
  }
  return Response.json({ ok: true });
}
