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
import dayjs from "dayjs";
import { getFirebaseDb } from "@/lib/firebase";

export type DailyEntry = {
  date: string;
  weight: number | null;
  updatedAt: Timestamp | null;
};

export type DailyInput = {
  weight?: number;
};

function dailiesCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "dailies");
}

export function dailyDocRef(uid: string, date: string) {
  return doc(dailiesCollection(uid), date);
}

export function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function relativeDate(key: string): string {
  const diffDays = dayjs(todayKey()).diff(dayjs(key), "day");
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return dayjs(key).format("dddd");
  return dayjs(key).format("MMM D");
}

export async function saveDaily(uid: string, date: string, input: DailyInput) {
  const payload: Record<string, unknown> = {
    date,
    updatedAt: serverTimestamp(),
  };
  if (input.weight !== undefined) payload.weight = input.weight;

  await setDoc(dailyDocRef(uid, date), payload, { merge: true });
}

export function mapDailyDoc(
  snap: QueryDocumentSnapshot<DocumentData>,
): DailyEntry {
  const data = snap.data();
  return {
    date: data.date as string,
    weight: (data.weight as number | undefined) ?? null,
    updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
  };
}

export function watchDailies(
  uid: string,
  onChange: (entries: DailyEntry[]) => void,
  onError: (error: Error) => void,
  max: number | null = 30,
  sinceDate: string | null = null,
) {
  const constraints: QueryConstraint[] = [orderBy("date", "desc")];
  if (sinceDate != null) constraints.push(where("date", ">=", sinceDate));
  if (max != null) constraints.push(limit(max));
  const recent = query(dailiesCollection(uid), ...constraints);
  return onSnapshot(
    recent,
    (snapshot) => {
      onChange(snapshot.docs.map(mapDailyDoc));
    },
    onError,
  );
}

export function watchDailyDoc(
  uid: string,
  date: string,
  onChange: (entry: DailyEntry | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    dailyDocRef(uid, date),
    (snapshot) => {
      onChange(snapshot.exists() ? mapDailyDoc(snapshot) : null);
    },
    onError,
  );
}
