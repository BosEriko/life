import { FieldValue } from "firebase-admin/firestore";
import { uidFromRequest } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { anthropicToolCall, HAIKU_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Field = "calories" | "sodium";

function clamp(value: unknown, max: number): number | null {
  const rounded = typeof value === "number" ? Math.round(value) : NaN;
  if (!Number.isFinite(rounded)) return null;
  return Math.min(Math.max(rounded, 0), max);
}

export async function POST(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    id?: unknown;
    kind?: unknown;
    category?: unknown;
    amount?: unknown;
    note?: unknown;
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
  const category = typeof body.category === "string" ? body.category : "";
  const amount = typeof body.amount === "string" ? body.amount : "";
  const note = typeof body.note === "string" ? body.note : "";
  const knownCalories =
    typeof body.calories === "number" && Number.isFinite(body.calories)
      ? Math.round(body.calories)
      : null;
  const knownSodium =
    typeof body.sodium === "number" && Number.isFinite(body.sodium)
      ? Math.round(body.sodium)
      : null;
  const requested: Field[] = Array.isArray(body.fields)
    ? (body.fields.filter(
        (field) => field === "calories" || field === "sodium",
      ) as Field[])
    : ["calories", "sodium"];
  if (requested.length === 0) return Response.json({ skipped: "nothing-asked" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ skipped: "not-configured" });

  const db = getAdminDb();
  const access = await db.doc(`claudeAccess/${uid}`).get();
  if (access.get("enabled") !== true) {
    return Response.json({ skipped: "no-access" });
  }

  const ref = db.doc(`users/${uid}/intake/${id}`);
  const current = (await ref.get()).data() ?? {};
  const fields = requested.filter(
    (field) => typeof current[field] !== "number",
  );
  if (fields.length === 0) return Response.json({ skipped: "already-filled" });

  let estimate: { calories?: unknown; sodium_mg?: unknown };
  try {
    estimate = await anthropicToolCall({
      apiKey,
      model: HAIKU_MODEL,
      system:
        "You estimate nutrition for a single food or drink entry in a personal tracker. " +
        "Give your best estimate of the TOTAL calories (kcal) and sodium (mg) for the portion described. " +
        "If the amount is vague or missing, assume one typical serving. Answer only through the tool.",
      prompt:
        `Kind: ${kind}\n` +
        `Category: ${category || "unspecified"}\n` +
        `Amount: ${amount || "not specified"}\n` +
        `Note: ${note || "none"}\n` +
        (knownCalories != null
          ? `Known calories for this portion: ${knownCalories} kcal (keep your other estimate consistent with this).\n`
          : "") +
        (knownSodium != null
          ? `Known sodium for this portion: ${knownSodium} mg (keep your other estimate consistent with this).\n`
          : ""),
      tool: {
        name: "estimate_nutrition",
        description:
          "Report the estimated total calories and sodium for this entry.",
        input_schema: {
          type: "object",
          properties: {
            calories: {
              type: "integer",
              description: "Total energy in kcal, 0 or greater.",
            },
            sodium_mg: {
              type: "integer",
              description: "Total sodium in milligrams, 0 or greater.",
            },
          },
          required: ["calories", "sodium_mg"],
        },
      },
      maxTokens: 256,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Estimation failed." },
      { status: 502 },
    );
  }

  const values: Record<Field, number | null> = {
    calories: clamp(estimate.calories, 15000),
    sodium: clamp(estimate.sodium_mg, 30000),
  };

  const patch: Record<string, unknown> = {};
  for (const field of fields) {
    if (values[field] != null) patch[field] = values[field];
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
