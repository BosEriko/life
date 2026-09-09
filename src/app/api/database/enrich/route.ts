import { FieldValue } from "firebase-admin/firestore";
import { uidFromRequest } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { estimateNutrition, type NutritionField } from "@/lib/nutrition-estimate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    id?: unknown;
    kind?: unknown;
    name?: unknown;
    category?: unknown;
    amount?: unknown;
    fields?: unknown;
    calories?: unknown;
    sodium?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const kind = body.kind === "drink" ? "drink" : "food";
  const name = typeof body.name === "string" ? body.name : "";
  const category = typeof body.category === "string" ? body.category : "";
  const amount = typeof body.amount === "string" ? body.amount : "";
  const knownCalories =
    typeof body.calories === "number" && Number.isFinite(body.calories)
      ? Math.round(body.calories)
      : null;
  const knownSodium =
    typeof body.sodium === "number" && Number.isFinite(body.sodium)
      ? Math.round(body.sodium)
      : null;
  const requested: NutritionField[] = Array.isArray(body.fields)
    ? (body.fields.filter(
        (field) => field === "calories" || field === "sodium",
      ) as NutritionField[])
    : ["calories", "sodium"];
  if (requested.length === 0) return Response.json({ skipped: "nothing-asked" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ skipped: "not-configured" });

  const db = getAdminDb();
  const access = await db.doc(`claudeAccess/${uid}`).get();
  if (access.get("enabled") !== true) {
    return Response.json({ skipped: "no-access" });
  }

  const ref = db.doc(`foods/${id}`);
  const current = (await ref.get()).data();
  if (!current) return Response.json({ skipped: "not-found" });
  const fields = requested.filter(
    (field) => typeof current[field] !== "number",
  );
  if (fields.length === 0) return Response.json({ skipped: "already-filled" });

  const result = await estimateNutrition({
    apiKey,
    name,
    amount,
    kind,
    category,
    knownCalories,
    knownSodium,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 502 });
  }

  const patch: Record<string, unknown> = {};
  for (const field of fields) {
    if (result[field] != null) patch[field] = result[field];
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ skipped: "no-estimate" });
  }
  patch.nutritionSource = "claude";
  patch.nutritionEstimatedAt = FieldValue.serverTimestamp();

  await ref.set(patch, { merge: true });

  return Response.json({
    calories: patch.calories ?? null,
    sodium: patch.sodium ?? null,
  });
}
