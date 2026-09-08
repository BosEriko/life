import { adminRoleFromRequest } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await adminRoleFromRequest(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  try {
    await getAdminDb().collection("foods").doc(id).delete();
    return Response.json({ id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete.";
    return Response.json({ error: message }, { status: 500 });
  }
}
