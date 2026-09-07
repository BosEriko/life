import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type QueryConstraint,
  type Timestamp,
} from "firebase/firestore";
import dayjs from "dayjs";
import { getFirebaseDb } from "@/lib/firebase";

export type DailyEntry = {
  date: string;
  weight: number | null;
  bath: boolean | null;
  brushTeeth: boolean | null;
  updatedAt: Timestamp | null;
};

export type DailyInput = {
  weight?: number;
  bath?: boolean;
  brushTeeth?: boolean;
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
  if (input.bath !== undefined) payload.bath = input.bath;
  if (input.brushTeeth !== undefined) payload.brushTeeth = input.brushTeeth;

  await setDoc(dailyDocRef(uid, date), payload, { merge: true });
}

export function watchDailies(
  uid: string,
  onChange: (entries: DailyEntry[]) => void,
  onError: (error: Error) => void,
  max: number | null = 30,
) {
  const constraints: QueryConstraint[] = [orderBy("date", "desc")];
  if (max != null) constraints.push(limit(max));
  const recent = query(dailiesCollection(uid), ...constraints);
  return onSnapshot(
    recent,
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            date: data.date as string,
            weight: (data.weight as number | undefined) ?? null,
            bath: (data.bath as boolean | undefined) ?? null,
            brushTeeth: (data.brushTeeth as boolean | undefined) ?? null,
            updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
          };
        }),
      );
    },
    onError,
  );
}
