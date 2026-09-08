import {
  collection,
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
import { getFirebaseDb } from "@/lib/firebase";

export type HabitEntry = {
  date: string;
  bath: boolean | null;
  brushTeeth: boolean | null;
  updatedAt: Timestamp | null;
};

export type HabitInput = {
  bath?: boolean;
  brushTeeth?: boolean;
};

function habitsCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "habits");
}

export function habitDocRef(uid: string, date: string) {
  return doc(habitsCollection(uid), date);
}

export async function saveHabits(uid: string, date: string, input: HabitInput) {
  const payload: Record<string, unknown> = {
    date,
    updatedAt: serverTimestamp(),
  };
  if (input.bath !== undefined) payload.bath = input.bath;
  if (input.brushTeeth !== undefined) payload.brushTeeth = input.brushTeeth;

  await setDoc(habitDocRef(uid, date), payload, { merge: true });
}

export function mapHabitDoc(
  snap: QueryDocumentSnapshot<DocumentData>,
): HabitEntry {
  const data = snap.data();
  return {
    date: data.date as string,
    bath: (data.bath as boolean | undefined) ?? null,
    brushTeeth: (data.brushTeeth as boolean | undefined) ?? null,
    updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
  };
}

export function watchHabits(
  uid: string,
  onChange: (entries: HabitEntry[]) => void,
  onError: (error: Error) => void,
  max: number | null = 30,
  sinceDate: string | null = null,
) {
  const constraints: QueryConstraint[] = [orderBy("date", "desc")];
  if (sinceDate != null) constraints.push(where("date", ">=", sinceDate));
  if (max != null) constraints.push(limit(max));
  const recent = query(habitsCollection(uid), ...constraints);
  return onSnapshot(
    recent,
    (snapshot) => {
      onChange(snapshot.docs.map(mapHabitDoc));
    },
    onError,
  );
}

export function watchHabitDoc(
  uid: string,
  date: string,
  onChange: (entry: HabitEntry | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    habitDocRef(uid, date),
    (snapshot) => {
      onChange(snapshot.exists() ? mapHabitDoc(snapshot) : null);
    },
    onError,
  );
}
