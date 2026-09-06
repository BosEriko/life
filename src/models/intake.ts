import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import dayjs from "dayjs";
import { getFirebaseDb } from "@/lib/firebase";
import { dailyIntake, type DailyIntake } from "@/lib/intake-summary";

export { dailyIntake };
export type { DailyIntake };

export type IntakeKind = "food" | "drink";

export const FOOD_CATEGORIES = [
  "Meal",
  "Snack",
  "Dessert / sweets",
  "Fast food",
  "Fried",
  "Fruit / veg",
  "Other",
];

export const DRINK_CATEGORIES = [
  "Coffee",
  "Tea",
  "Soda",
  "Juice",
  "Alcohol",
  "Energy drink",
  "Milk",
  "Other",
];

const JUNK_BY_DEFAULT = new Set([
  "Dessert / sweets",
  "Fast food",
  "Fried",
  "Soda",
  "Juice",
  "Alcohol",
  "Energy drink",
]);

export function defaultJunk(category: string): boolean {
  return JUNK_BY_DEFAULT.has(category);
}

export type IntakeEntry = {
  id: string;
  date: string;
  time: string;
  kind: IntakeKind;
  category: string;
  junk: boolean;
  calories: number | null;
  sodium: number | null;
  amount: string | null;
  note: string | null;
  createdAt: Timestamp | null;
};

export type IntakeInput = {
  date: string;
  time: string;
  kind: IntakeKind;
  category: string;
  junk: boolean;
  calories?: number | null;
  sodium?: number | null;
  amount?: string | null;
  note?: string | null;
};

function intakeCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "intake");
}

export function formatIntakeTime(dateKey: string, time: string): string {
  return dayjs(`${dateKey}T${time}`).format("h:mm A");
}

export function watchIntake(
  uid: string,
  onChange: (entries: IntakeEntry[]) => void,
  onError: (error: Error) => void,
  max = 2000,
) {
  const recent = query(
    intakeCollection(uid),
    orderBy("date", "desc"),
    limit(max),
  );
  return onSnapshot(
    recent,
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            date: (data.date as string | undefined) ?? "",
            time: (data.time as string | undefined) ?? "",
            kind: (data.kind as IntakeKind | undefined) ?? "food",
            category: (data.category as string | undefined) ?? "",
            junk: (data.junk as boolean | undefined) ?? false,
            calories: (data.calories as number | undefined) ?? null,
            sodium: (data.sodium as number | undefined) ?? null,
            amount: (data.amount as string | undefined) ?? null,
            note: (data.note as string | undefined) ?? null,
            createdAt: (data.createdAt as Timestamp | undefined) ?? null,
          };
        }),
      );
    },
    onError,
  );
}

export async function addIntake(uid: string, input: IntakeInput) {
  await addDoc(intakeCollection(uid), {
    date: input.date,
    time: input.time,
    kind: input.kind,
    category: input.category,
    junk: input.junk,
    calories: input.calories ?? null,
    sodium: input.sodium ?? null,
    amount: input.amount ?? null,
    note: input.note ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function deleteIntake(uid: string, id: string) {
  await deleteDoc(doc(intakeCollection(uid), id));
}
