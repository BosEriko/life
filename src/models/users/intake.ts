import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
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

export type IntakeEntry = {
  id: string;
  date: string;
  time: string;
  kind: IntakeKind;
  name: string;
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
  name: string;
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

export function mapIntakeDoc(
  snap: QueryDocumentSnapshot<DocumentData>,
): IntakeEntry {
  const data = snap.data();
  return {
    id: snap.id,
    date: (data.date as string | undefined) ?? "",
    time: (data.time as string | undefined) ?? "",
    kind: (data.kind as IntakeKind | undefined) ?? "food",
    name: (data.name as string | undefined) ?? "",
    category: (data.category as string | undefined) ?? "",
    junk: (data.junk as boolean | undefined) ?? false,
    calories: (data.calories as number | undefined) ?? null,
    sodium: (data.sodium as number | undefined) ?? null,
    amount: (data.amount as string | undefined) ?? null,
    note: (data.note as string | undefined) ?? null,
    createdAt: (data.createdAt as Timestamp | undefined) ?? null,
  };
}

export function watchIntake(
  uid: string,
  onChange: (entries: IntakeEntry[]) => void,
  onError: (error: Error) => void,
  max: number | null = 2000,
  sinceDate: string | null = null,
) {
  const constraints: QueryConstraint[] = [orderBy("date", "desc")];
  if (sinceDate != null) constraints.push(where("date", ">=", sinceDate));
  if (max != null) constraints.push(limit(max));
  const recent = query(intakeCollection(uid), ...constraints);
  return onSnapshot(
    recent,
    (snapshot) => {
      onChange(snapshot.docs.map(mapIntakeDoc));
    },
    onError,
  );
}

export function watchIntakeForDate(
  uid: string,
  date: string,
  onChange: (entries: IntakeEntry[]) => void,
  onError: (error: Error) => void,
) {
  const byDate = query(intakeCollection(uid), where("date", "==", date));
  return onSnapshot(
    byDate,
    (snapshot) => {
      onChange(snapshot.docs.map(mapIntakeDoc));
    },
    onError,
  );
}

export function addIntake(
  uid: string,
  input: IntakeInput,
): { id: string; done: Promise<void> } {
  const ref = doc(intakeCollection(uid));
  const payload: Record<string, unknown> = {
    date: input.date,
    time: input.time,
    kind: input.kind,
    name: input.name,
    category: input.category,
    junk: input.junk,
    createdAt: serverTimestamp(),
  };
  if (input.calories != null) payload.calories = input.calories;
  if (input.sodium != null) payload.sodium = input.sodium;
  if (input.amount != null) payload.amount = input.amount;
  if (input.note != null) payload.note = input.note;

  const done = setDoc(ref, payload, { merge: true });
  return { id: ref.id, done };
}

export async function updateIntake(
  uid: string,
  id: string,
  input: IntakeInput,
) {
  await setDoc(
    doc(intakeCollection(uid), id),
    {
      date: input.date,
      time: input.time,
      kind: input.kind,
      name: input.name,
      category: input.category,
      junk: input.junk,
      calories: input.calories ?? null,
      sodium: input.sodium ?? null,
      amount: input.amount ?? null,
      note: input.note ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteIntake(uid: string, id: string) {
  await deleteDoc(doc(intakeCollection(uid), id));
}
