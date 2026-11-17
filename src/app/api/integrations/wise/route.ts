import { uidFromRequest } from "@/lib/api-auth";
import { readWiseConnection, removeWiseConnection, saveWiseConnection, syncWise, WiseError, wiseBalances, wiseProfileId } from "@/lib/wise-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function status(uid: string, withBalances = false) {
  const connection = await readWiseConnection(uid);
  if (!connection) return { connected: false as const };
  return {
    connected: true as const,
    connectedAt: connection.connectedAt,
    lastSyncedAt: connection.lastSyncedAt,
    lastError: connection.lastError,
    links: connection.accounts,
    ...(withBalances ? { balances: await wiseBalances(connection) } : {}),
  };
}

export async function GET(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await status(uid, new URL(request.url).searchParams.get("balances") === "1"));
  } catch (error) {
    return Response.json({ error: error instanceof WiseError ? error.message : "Could not reach Wise." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!/^[A-Za-z0-9-]{20,100}$/.test(token)) {
    return Response.json({ error: "That doesn't look like a Wise API token." }, { status: 400 });
  }

  try {
    await saveWiseConnection(uid, token, await wiseProfileId(token));
    await syncWise(uid, { force: true });
  } catch (error) {
    const message = error instanceof WiseError ? error.message : "Could not connect to Wise.";
    return Response.json({ error: message, ...(await status(uid)) }, { status: 400 });
  }
  return Response.json(await status(uid));
}

export async function DELETE(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await removeWiseConnection(uid);
  return Response.json({ connected: false });
}
