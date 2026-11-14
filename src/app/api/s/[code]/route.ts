import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { fetchExportData } from "@/lib/export-data";
import { emergencyFund, emergencyFundAverageMonthsOrDefault, emergencyFundMonthsOrDefault, emergencyFundSince, type FinanceAccount } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Resolved =
  | {
      ok: true;
      uid: string;
      kind: "health" | "emergencyFund";
      label: string | null;
      expiresAt: number | null;
      maxUses: number | null;
      useCount: number;
    }
  | { ok: false; reason: "not-found" | "revoked" | "expired" | "exhausted" };

const ERROR_TEXT: Record<
  Exclude<Resolved, { ok: true }>["reason"],
  string
> = {
  "not-found": "This link doesn't exist.",
  revoked: "This link has been revoked.",
  expired: "This link has expired.",
  exhausted: "This link has reached its view limit.",
};

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const db = getAdminDb();
  const ref = db.collection("shareLinks").doc(code);

  let result: Resolved;
  try {
    result = await db.runTransaction(async (tx): Promise<Resolved> => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { ok: false, reason: "not-found" };

      const data = snap.data() ?? {};
      if (data.revoked === true) return { ok: false, reason: "revoked" };

      const expiresAt = (data.expiresAt as number | null) ?? null;
      if (expiresAt != null && Date.now() > expiresAt) {
        return { ok: false, reason: "expired" };
      }

      const maxUses = (data.maxUses as number | null) ?? null;
      const useCount = (data.useCount as number | undefined) ?? 0;
      if (maxUses != null && useCount >= maxUses) {
        return { ok: false, reason: "exhausted" };
      }

      tx.update(ref, { useCount: FieldValue.increment(1) });
      return {
        ok: true,
        uid: data.uid as string,
        kind: data.kind === "emergencyFund" ? "emergencyFund" : "health",
        label: (data.label as string | undefined) ?? null,
        expiresAt,
        maxUses,
        useCount: useCount + 1,
      };
    });
  } catch {
    return Response.json(
      { error: "Could not open this link." },
      { status: 500 },
    );
  }

  if (!result.ok) {
    return Response.json({ error: ERROR_TEXT[result.reason] }, { status: 410 });
  }

  const link = {
    label: result.label,
    expiresAt: result.expiresAt,
    maxUses: result.maxUses,
    useCount: result.useCount,
    remainingUses:
      result.maxUses != null
        ? Math.max(0, result.maxUses - result.useCount)
        : null,
  };

  if (result.kind === "emergencyFund") {
    const userRef = db.collection("users").doc(result.uid);
    const [profileSnap, settingsSnap] = await Promise.all([
      userRef.collection("profile").doc("current").get(),
      userRef.collection("financeSettings").doc("current").get(),
    ]);
    const timezone = profileSnap.get("timezone");
    const today = todayIn(typeof timezone === "string" ? timezone : null);
    const settings = settingsSnap.data() ?? {};
    const goal = emergencyFundMonthsOrDefault(settings.emergencyFundMonths);
    const period = emergencyFundAverageMonthsOrDefault(settings.emergencyFundAverageMonths);
    const records = await userRef
      .collection("financeRecords")
      .where("date", ">=", emergencyFundSince(today, period))
      .get();
    const fund = emergencyFund(
      Object.values((settings.accounts ?? {}) as Record<string, FinanceAccount>),
      records.docs.map((doc) => {
        const record = doc.data();
        return {
          type: record.type,
          accountId: record.accountId,
          date: record.date,
          amountMinor: record.amountMinor,
        };
      }),
      goal,
      period,
      today,
    );
    const name = profileSnap.get("name");
    return Response.json({
      kind: "emergencyFund",
      ownerName: typeof name === "string" && name.trim() ? name.trim() : "Someone",
      fund,
      today,
      asOf: new Date().toISOString(),
      link,
    });
  }

  const data = await fetchExportData(result.uid, { range: "7d" });

  return Response.json({
    kind: "health",
    ownerName: data.profile.name || "Someone",
    weightUnit: data.profile.weightUnit,
    volumeUnit: data.profile.volumeUnit,
    generatedAt: data.generatedAt,
    range: data.range,
    count: data.count,
    dailies: data.dailies,
    ideals: data.ideals,
    link,
  });
}

function todayIn(timezone: string | null) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone ?? undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
