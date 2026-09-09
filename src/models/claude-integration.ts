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

export type IntakeEnrichmentRequest = {
  id: string;
  kind: string;
  name: string;
  category: string;
  amount: string | null;
  note: string | null;
  calories: number | null;
  sodium: number | null;
  fields: ("calories" | "sodium")[];
};

export async function requestIntakeEnrichment(
  user: User,
  payload: IntakeEnrichmentRequest,
): Promise<void> {
  const token = await user.getIdToken();
  await fetch("/api/intake/enrich", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export type FoodEnrichmentRequest = {
  id: string;
  kind: string;
  name: string;
  category: string;
  amount: string | null;
  calories: number | null;
  sodium: number | null;
  fields: ("calories" | "sodium")[];
};

export async function requestFoodEnrichment(
  user: User,
  payload: FoodEnrichmentRequest,
): Promise<void> {
  const token = await user.getIdToken();
  await fetch("/api/database/enrich", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Fire-and-forget nutrition top-up for a food-directory entry. No-ops when
 * nothing is missing or the client is offline; the server ignores it unless the
 * caller has Claude autofill enabled.
 */
export function enrichFoodIfNeeded(
  user: User,
  food: {
    id: string;
    kind: string;
    name: string;
    category: string;
    amount: string | null;
    calories: number | null;
    sodium: number | null;
  },
): void {
  const fields: ("calories" | "sodium")[] = [];
  if (food.calories == null) fields.push("calories");
  if (food.sodium == null) fields.push("sodium");
  if (
    fields.length === 0 ||
    typeof navigator === "undefined" ||
    !navigator.onLine
  ) {
    return;
  }
  requestFoodEnrichment(user, {
    id: food.id,
    kind: food.kind,
    name: food.name,
    category: food.category,
    amount: food.amount,
    calories: food.calories,
    sodium: food.sodium,
    fields,
  }).catch(() => {});
}
