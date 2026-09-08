import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export type IdealRange = { min: number | null; max: number | null };

export type EatingWindow = { start: string | null; end: string | null };

export type IdealKey =
  | "weight"
  | "systolic"
  | "diastolic"
  | "water"
  | "calories"
  | "sodium";

export type Ideals = Record<IdealKey, IdealRange> & {
  eatingWindow: EatingWindow;
};

const EMPTY_RANGE: IdealRange = { min: null, max: null };
const EMPTY_WINDOW: EatingWindow = { start: null, end: null };

export const EMPTY_IDEALS: Ideals = {
  weight: EMPTY_RANGE,
  systolic: EMPTY_RANGE,
  diastolic: EMPTY_RANGE,
  water: EMPTY_RANGE,
  calories: EMPTY_RANGE,
  sodium: EMPTY_RANGE,
  eatingWindow: EMPTY_WINDOW,
};

export type IdealStatus = "ok" | "low" | "high" | "unset";

function idealsDoc(uid: string) {
  return doc(getFirebaseDb(), "users", uid, "ideals", "current");
}

function readRange(value: unknown): IdealRange {
  const raw = (value ?? {}) as Partial<IdealRange>;
  return {
    min: typeof raw.min === "number" ? raw.min : null,
    max: typeof raw.max === "number" ? raw.max : null,
  };
}

function readEatingWindow(value: unknown): EatingWindow {
  const raw = (value ?? {}) as Partial<EatingWindow>;
  const clean = (time: unknown) =>
    typeof time === "string" && /^\d{2}:\d{2}$/.test(time) ? time : null;
  return { start: clean(raw.start), end: clean(raw.end) };
}

export function watchIdeals(
  uid: string,
  onChange: (ideals: Ideals) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    idealsDoc(uid),
    (snapshot) => {
      const data = snapshot.data() ?? {};
      onChange({
        weight: readRange(data.weight),
        systolic: readRange(data.systolic),
        diastolic: readRange(data.diastolic),
        water: readRange(data.water),
        calories: readRange(data.calories),
        sodium: readRange(data.sodium),
        eatingWindow: readEatingWindow(data.eatingWindow),
      });
    },
    onError,
  );
}

export async function saveIdeals(uid: string, ideals: Ideals) {
  await setDoc(
    idealsDoc(uid),
    { ...ideals, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function evaluateIdeal(
  value: number | null,
  range: IdealRange | undefined,
): IdealStatus {
  if (value == null || !range) return "unset";
  if (range.min == null && range.max == null) return "unset";
  if (range.min != null && value < range.min) return "low";
  if (range.max != null && value > range.max) return "high";
  return "ok";
}

export function worstStatus(...statuses: IdealStatus[]): IdealStatus {
  if (statuses.includes("high")) return "high";
  if (statuses.includes("low")) return "low";
  if (statuses.some((status) => status === "ok")) return "ok";
  return "unset";
}

export function rangeText(range: IdealRange): string {
  if (range.min != null && range.max != null) return `${range.min}–${range.max}`;
  if (range.min != null) return `at least ${range.min}`;
  if (range.max != null) return `at most ${range.max}`;
  return "";
}
