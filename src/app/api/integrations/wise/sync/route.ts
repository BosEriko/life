import { uidFromRequest } from "@/lib/api-auth";
import { syncWise, WiseError } from "@/lib/wise-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const force = new URL(request.url).searchParams.get("force") === "1";
  try {
    return Response.json(await syncWise(uid, { force }));
  } catch (error) {
    return Response.json({ error: error instanceof WiseError ? error.message : "Could not sync with Wise." }, { status: 502 });
  }
}
