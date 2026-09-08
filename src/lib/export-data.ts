import { getAdminDb } from "@/lib/firebase-admin";
import { dailyBpAverages } from "@/lib/bp-average";
import { dailyWaterTotals } from "@/lib/water-total";
import { dailyIntake } from "@/lib/intake-summary";

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

  let habitsQuery = userRef
    .collection("habits")
    .orderBy("date", "desc")
    .limit(limit);
  if (from) habitsQuery = habitsQuery.where("date", ">=", from);
  if (to) habitsQuery = habitsQuery.where("date", "<=", to);

  let bpQuery = userRef
    .collection("bpReadings")
    .orderBy("date", "desc")
    .limit(limit);
  if (from) bpQuery = bpQuery.where("date", ">=", from);
  if (to) bpQuery = bpQuery.where("date", "<=", to);

  let waterQuery = userRef
    .collection("waterLogs")
    .orderBy("date", "desc")
    .limit(limit);
  if (from) waterQuery = waterQuery.where("date", ">=", from);
  if (to) waterQuery = waterQuery.where("date", "<=", to);

  let intakeQuery = userRef
    .collection("intake")
    .orderBy("date", "desc")
    .limit(limit);
  if (from) intakeQuery = intakeQuery.where("date", ">=", from);
  if (to) intakeQuery = intakeQuery.where("date", "<=", to);

  let notesQuery = userRef
    .collection("notes")
    .orderBy("date", "desc")
    .limit(limit);
  if (from) notesQuery = notesQuery.where("date", ">=", from);
  if (to) notesQuery = notesQuery.where("date", "<=", to);

  const [
    dailiesSnap,
    habitsSnap,
    bpSnap,
    waterSnap,
    intakeSnap,
    notesSnap,
    idealsSnap,
    presetsSnap,
    profileSnap,
  ] = await Promise.all([
    dailiesQuery.get(),
    habitsQuery.get(),
    bpQuery.get(),
    waterQuery.get(),
    intakeQuery.get(),
    notesQuery.get(),
    userRef.collection("ideals").doc("current").get(),
    userRef.collection("presets").orderBy("ml", "asc").get(),
    userRef.collection("profile").doc("current").get(),
  ]);

  const bpReadings = bpSnap.docs
    .map((doc) => {
      const b = doc.data();
      return {
        id: doc.id,
        date: String(b.date ?? ""),
        systolic: clean(b.systolic),
        diastolic: clean(b.diastolic),
        time: clean(b.time),
        posture: clean(b.posture),
        arm: clean(b.arm),
        createdAt: toIso(b.createdAt),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const bpByDate = dailyBpAverages(
    bpReadings.map((reading) => ({
      date: reading.date,
      systolic: Number(reading.systolic),
      diastolic: Number(reading.diastolic),
      time: typeof reading.time === "string" ? reading.time : null,
    })),
  );

  const waterLogs = waterSnap.docs
    .map((doc) => {
      const w = doc.data();
      return {
        id: doc.id,
        date: String(w.date ?? ""),
        ml: clean(w.ml),
        time: clean(w.time),
        label: clean(w.label),
        createdAt: toIso(w.createdAt),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const waterByDate = dailyWaterTotals(
    waterLogs.map((log) => ({
      date: log.date,
      ml: Number(log.ml),
      time: typeof log.time === "string" ? log.time : null,
    })),
  );

  const intake = intakeSnap.docs
    .map((doc) => {
      const i = doc.data();
      return {
        id: doc.id,
        date: String(i.date ?? ""),
        time: clean(i.time),
        kind: clean(i.kind),
        name: clean(i.name),
        category: clean(i.category),
        junk: clean(i.junk),
        calories: clean(i.calories),
        sodium: clean(i.sodium),
        amount: clean(i.amount),
        note: clean(i.note),
        nutritionSource: clean(i.nutritionSource),
        createdAt: toIso(i.createdAt),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const notes = notesSnap.docs
    .map((doc) => {
      const n = doc.data();
      return {
        id: doc.id,
        date: String(n.date ?? ""),
        time: clean(n.time),
        text: clean(n.text),
        createdAt: toIso(n.createdAt),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const intakeByDate = dailyIntake(
    intake.map((entry) => ({
      date: entry.date,
      kind: entry.kind === "drink" ? "drink" : "food",
      junk: entry.junk === true,
      calories: typeof entry.calories === "number" ? entry.calories : null,
      sodium: typeof entry.sodium === "number" ? entry.sodium : null,
    })),
  );

  const dailyDataById = new Map<string, Record<string, unknown>>();
  for (const doc of dailiesSnap.docs) dailyDataById.set(doc.id, doc.data());
  const habitDataById = new Map<string, Record<string, unknown>>();
  for (const doc of habitsSnap.docs) habitDataById.set(doc.id, doc.data());

  const dailyDates = new Set<string>([
    ...dailyDataById.keys(),
    ...habitDataById.keys(),
  ]);

  const dailies = Array.from(dailyDates)
    .map((date) => {
      const d = dailyDataById.get(date) ?? {};
      const h = habitDataById.get(date);
      const bp = bpByDate.get(date);
      const water = waterByDate.get(date);
      const meals = intakeByDate.get(date);
      return {
        date,
        weight: clean(d.weight),
        systolic: bp ? bp.systolic : null,
        diastolic: bp ? bp.diastolic : null,
        bpTime: bp ? bp.time : null,
        bpReadingCount: bp ? bp.count : 0,
        water: water ? water.ml : null,
        waterLogCount: water ? water.count : 0,
        junkFood: meals ? meals.junkFood : false,
        junkDrink: meals ? meals.junkDrink : false,
        calories: meals ? meals.calories : 0,
        sodium: meals ? meals.sodium : 0,
        intakeCount: meals ? meals.count : 0,
        bath: h ? clean(h.bath) : null,
        brushTeeth: h ? clean(h.brushTeeth) : null,
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
    calories: clean(idealsData.calories),
    sodium: clean(idealsData.sodium),
    eatingWindow: clean(idealsData.eatingWindow),
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
    weightUnit: clean(profileData.weightUnit),
    volumeUnit: clean(profileData.volumeUnit),
    heightUnit: clean(profileData.heightUnit),
    ageYears: computeAge(birthday),
    heightTotalInches: computeHeightTotalInches(heightFeet, heightInches),
  };

  return {
    generatedAt: new Date().toISOString(),
    range: { from, to },
    count: dailies.length,
    dailies,
    bpReadings,
    waterLogs,
    intake,
    notes,
    ideals,
    presets,
    profile,
  };
}
