import { uidFromRequest } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await ctx.params;
  const ref = getAdminDb().collection("shareLinks").doc(code);
  const snap = await ref.get();
  if (!snap.exists || snap.get("uid") !== uid) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await ref.delete();
  return Response.json({ code });
}
