import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DAYS = 2000;

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
  "7": 7,
  "30": 30,
  "90": 90,
  "365": 365,
};

function extractKey(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return (request.headers.get("x-api-key") ?? "").trim();
}

async function authorized(
  db: Firestore,
  uid: string,
  request: Request,
): Promise<boolean> {
  const provided = extractKey(request);
  if (!provided) return false;

  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("apiKeys")
    .doc("current")
    .get();
  const stored = snap.data()?.hash;
  if (typeof stored !== "string" || stored.length === 0) return false;

  const providedHash = createHash("sha256").update(provided).digest("hex");
  const a = Buffer.from(providedHash);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

function toIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  return null;
}

function clean<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

export async function GET(request: Request) {
  const uid = process.env.EXPORT_UID;
  if (!uid) {
    return NextResponse.json(
      { error: "EXPORT_UID is not configured." },
      { status: 500 },
    );
  }

  const db = getAdminDb();
  if (!(await authorized(db, uid, request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to");
  let from = searchParams.get("from");

  const range = (searchParams.get("range") ?? "").toLowerCase();
  if (!from && range && range !== "all") {
    const days = RANGE_DAYS[range];
    if (days) {
      const start = new Date();
      start.setUTCDate(start.getUTCDate() - (days - 1));
      from = start.toISOString().slice(0, 10);
    }
  }

  const limitParam = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_DAYS)
      : MAX_DAYS;

  const userRef = db.collection("users").doc(uid);

  let dailiesQuery = userRef
    .collection("dailies")
    .orderBy("date", "desc")
    .limit(limit);
  if (from) dailiesQuery = dailiesQuery.where("date", ">=", from);
  if (to) dailiesQuery = dailiesQuery.where("date", "<=", to);

  const [dailiesSnap, idealsSnap, presetsSnap] = await Promise.all([
    dailiesQuery.get(),
    userRef.collection("ideals").doc("current").get(),
    userRef.collection("presets").orderBy("ml", "asc").get(),
  ]);

  const dailies = dailiesSnap.docs
    .map((doc) => {
      const d = doc.data();
      return {
        date: doc.id,
        weight: clean(d.weight),
        systolic: clean(d.systolic),
        diastolic: clean(d.diastolic),
        bpTime: clean(d.bpTime),
        bpPosture: clean(d.bpPosture),
        bpArm: clean(d.bpArm),
        water: clean(d.water),
        notes: clean(d.notes),
        junkFood: clean(d.junkFood),
        junkDrink: clean(d.junkDrink),
        bath: clean(d.bath),
        brushTeeth: clean(d.brushTeeth),
        updatedAt: toIso(d.updatedAt),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const idealsData = idealsSnap.data() ?? {};
  const ideals = {
    weight: clean(idealsData.weight),
    systolic: clean(idealsData.systolic),
    diastolic: clean(idealsData.diastolic),
    water: clean(idealsData.water),
  };

  const presets = presetsSnap.docs.map((doc) => {
    const p = doc.data();
    return { name: p.name ?? "", ml: p.ml ?? 0 };
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    range: { from: from ?? null, to: to ?? null },
    count: dailies.length,
    dailies,
    ideals,
    presets,
  });
}
