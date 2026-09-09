import {
  anthropicToolCall,
  HAIKU_MODEL,
  isCreditExhaustedError,
} from "@/lib/anthropic";
import { setAnthropicCreditAlert } from "@/lib/anthropic-alert";

export type NutritionField = "calories" | "sodium";

export type NutritionEstimateInput = {
  apiKey: string;
  name: string;
  amount: string;
  kind: "food" | "drink";
  category: string;
  note?: string;
  knownCalories: number | null;
  knownSodium: number | null;
};

export type NutritionEstimateResult =
  | { ok: true; calories: number | null; sodium: number | null }
  | { ok: false; error: string };

function clamp(value: unknown, max: number): number | null {
  const rounded = typeof value === "number" ? Math.round(value) : NaN;
  if (!Number.isFinite(rounded)) return null;
  return Math.min(Math.max(rounded, 0), max);
}

export async function estimateNutrition(
  input: NutritionEstimateInput,
): Promise<NutritionEstimateResult> {
  let estimate: { calories?: unknown; sodium_mg?: unknown };
  try {
    estimate = await anthropicToolCall({
      apiKey: input.apiKey,
      model: HAIKU_MODEL,
      system:
        "You estimate nutrition for a single food or drink entry in a personal tracker. " +
        "Base your estimate on the item name, the amount, and the note. " +
        "The note may mention brand, preparation, ingredients, sides, or size — factor all of it in. " +
        "Give your best estimate of the TOTAL calories (kcal) and sodium (mg) for the portion described. " +
        "If the amount is vague or missing, assume one typical serving. Answer only through the tool.",
      prompt:
        `Item: ${input.name || "unspecified"}\n` +
        `Amount: ${input.amount || "one typical serving"}\n` +
        `Kind: ${input.kind}\n` +
        `Category: ${input.category || "unspecified"}\n` +
        (input.note != null ? `Note: ${input.note || "none"}\n` : "") +
        (input.knownCalories != null
          ? `Known calories for this portion: ${input.knownCalories} kcal (keep your other estimate consistent with this).\n`
          : "") +
        (input.knownSodium != null
          ? `Known sodium for this portion: ${input.knownSodium} mg (keep your other estimate consistent with this).\n`
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
    const detail =
      error instanceof Error ? error.message : "Estimation failed.";
    if (isCreditExhaustedError(detail)) {
      await setAnthropicCreditAlert(true, detail);
    }
    return { ok: false, error: detail };
  }

  return {
    ok: true,
    calories: clamp(estimate.calories, 15000),
    sodium: clamp(estimate.sodium_mg, 30000),
  };
}
