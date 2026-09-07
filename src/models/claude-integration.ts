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
