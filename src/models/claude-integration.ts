import type { User } from "firebase/auth";

export async function testClaudeConnection(
  user: User,
): Promise<{ ok: boolean; error?: string }> {
  const token = await user.getIdToken();
  const res = await fetch("/api/integrations/claude", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok) return { ok: false, error: data.error ?? "Request failed." };
  return { ok: data.ok === true, error: data.error };
}

export type NutritionField = "calories" | "sodium";

export type EnrichmentResult = {
  calories: number | null;
  sodium: number | null;
  skipped?: string;
};

export function missingNutritionFields(entry: {
  calories: number | null;
  sodium: number | null;
}): NutritionField[] {
  const fields: NutritionField[] = [];
  if (entry.calories == null) fields.push("calories");
  if (entry.sodium == null) fields.push("sodium");
  return fields;
}

async function postEnrichment(
  url: string,
  user: User,
  payload: unknown,
): Promise<EnrichmentResult> {
  const token = await user.getIdToken();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    calories?: number | null;
    sodium?: number | null;
    skipped?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status}).`);
  }
  return {
    calories: data.calories ?? null,
    sodium: data.sodium ?? null,
    skipped: data.skipped,
  };
}

export type IntakeEnrichmentRequest = {
  id: string;
  kind: string;
  name: string;
  category: string;
  amount: string | null;
  note: string | null;
  calories: number | null;
  sodium: number | null;
  fields: NutritionField[];
};

export function requestIntakeEnrichment(
  user: User,
  payload: IntakeEnrichmentRequest,
): Promise<EnrichmentResult> {
  return postEnrichment("/api/intake/enrich", user, payload);
}

export type FoodEnrichmentRequest = {
  id: string;
  kind: string;
  name: string;
  category: string;
  amount: string | null;
  calories: number | null;
  sodium: number | null;
  fields: NutritionField[];
};

export function requestFoodEnrichment(
  user: User,
  payload: FoodEnrichmentRequest,
): Promise<EnrichmentResult> {
  return postEnrichment("/api/database/enrich", user, payload);
}

type IntakeNutritionTarget = Omit<IntakeEnrichmentRequest, "fields">;
type FoodNutritionTarget = Omit<FoodEnrichmentRequest, "fields">;

/**
 * Fire-and-forget nutrition top-up for an intake entry. No-ops when nothing is
 * missing or the client is offline; the server ignores it unless the caller is
 * marked intelligent.
 */
export function enrichIntakeIfNeeded(
  user: User,
  entry: IntakeNutritionTarget,
): Promise<EnrichmentResult | undefined> | undefined {
  const fields = missingNutritionFields(entry);
  if (
    fields.length === 0 ||
    typeof navigator === "undefined" ||
    !navigator.onLine
  ) {
    return undefined;
  }
  return requestIntakeEnrichment(user, { ...entry, fields }).catch(
    () => undefined,
  );
}

/**
 * Fire-and-forget nutrition top-up for a food-directory entry. No-ops when
 * nothing is missing or the client is offline; the server ignores it unless the
 * caller is marked intelligent.
 */
export function enrichFoodIfNeeded(
  user: User,
  food: FoodNutritionTarget,
): Promise<EnrichmentResult | undefined> | undefined {
  const fields = missingNutritionFields(food);
  if (
    fields.length === 0 ||
    typeof navigator === "undefined" ||
    !navigator.onLine
  ) {
    return undefined;
  }
  return requestFoodEnrichment(user, { ...food, fields }).catch(() => undefined);
}

/** On-demand recalculation, filling only the still-missing fields. */
export function recalcIntakeNutrition(
  user: User,
  entry: IntakeNutritionTarget,
): Promise<EnrichmentResult> {
  const fields = missingNutritionFields(entry);
  if (fields.length === 0) {
    return Promise.resolve({
      calories: entry.calories,
      sodium: entry.sodium,
      skipped: "already-filled",
    });
  }
  return requestIntakeEnrichment(user, { ...entry, fields });
}

export function recalcFoodNutrition(
  user: User,
  food: FoodNutritionTarget,
): Promise<EnrichmentResult> {
  const fields = missingNutritionFields(food);
  if (fields.length === 0) {
    return Promise.resolve({
      calories: food.calories,
      sodium: food.sodium,
      skipped: "already-filled",
    });
  }
  return requestFoodEnrichment(user, { ...food, fields });
}
