import { getAdminDb } from "@/lib/firebase-admin";

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

export type ExportOptions = {
  range?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number | null;
};

function toIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  return null;
}

function clean<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

function computeAge(birthday: string | null): number | null {
  if (!birthday) return null;
  const born = new Date(birthday);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const hadBirthdayThisYear =
    now.getUTCMonth() > born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() &&
      now.getUTCDate() >= born.getUTCDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

function computeHeightTotalInches(
  feet: number | null,
  inches: number | null,
): number | null {
  if (feet == null && inches == null) return null;
  return (feet ?? 0) * 12 + (inches ?? 0);
}

export async function fetchExportData(uid: string, opts: ExportOptions = {}) {
  const db = getAdminDb();

  const to = opts.to ?? null;
  let from = opts.from ?? null;

  const range = (opts.range ?? "").toLowerCase();
  if (!from && range && range !== "all") {
    const days = RANGE_DAYS[range];
    if (days) {
      const start = new Date();
      start.setUTCDate(start.getUTCDate() - (days - 1));
      from = start.toISOString().slice(0, 10);
    }
  }

  const limit =
    typeof opts.limit === "number" && opts.limit > 0
      ? Math.min(opts.limit, MAX_DAYS)
      : MAX_DAYS;

  const userRef = db.collection("users").doc(uid);

  let dailiesQuery = userRef
    .collection("dailies")
    .orderBy("date", "desc")
    .limit(limit);
  if (from) dailiesQuery = dailiesQuery.where("date", ">=", from);
  if (to) dailiesQuery = dailiesQuery.where("date", "<=", to);

  const [dailiesSnap, idealsSnap, presetsSnap, profileSnap] = await Promise.all([
    dailiesQuery.get(),
    userRef.collection("ideals").doc("current").get(),
    userRef.collection("presets").orderBy("ml", "asc").get(),
    userRef.collection("profile").doc("current").get(),
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

  const profileData = profileSnap.data() ?? {};
  const heightFeet =
    typeof profileData.heightFeet === "number" ? profileData.heightFeet : null;
  const heightInches =
    typeof profileData.heightInches === "number"
      ? profileData.heightInches
      : null;
  const birthday =
    typeof profileData.birthday === "string" ? profileData.birthday : null;
  const profile = {
    name: clean(profileData.name),
    birthday: clean(profileData.birthday),
    heightFeet: clean(profileData.heightFeet),
    heightInches: clean(profileData.heightInches),
    sex: clean(profileData.sex),
    timezone: clean(profileData.timezone),
    ageYears: computeAge(birthday),
    heightTotalInches: computeHeightTotalInches(heightFeet, heightInches),
  };

  return {
    generatedAt: new Date().toISOString(),
    range: { from, to },
    count: dailies.length,
    dailies,
    ideals,
    presets,
    profile,
  };
}
