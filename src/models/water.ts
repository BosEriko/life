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
  type QueryConstraint,
  type Timestamp,
} from "firebase/firestore";
import dayjs from "dayjs";
import { getFirebaseDb } from "@/lib/firebase";
import { dailyWaterTotals, type DailyWater } from "@/lib/water-total";

export { dailyWaterTotals };
export type { DailyWater };

export type WaterLog = {
  id: string;
  date: string;
  ml: number;
  time: string;
  label: string | null;
  createdAt: Timestamp | null;
};

export type WaterLogInput = {
  date: string;
  ml: number;
  time: string;
  label?: string | null;
};

function waterCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "waterLogs");
}

export function formatWaterTime(dateKey: string, time: string): string {
  return dayjs(`${dateKey}T${time}`).format("h:mm A");
}

export function watchWaterLogs(
  uid: string,
  onChange: (logs: WaterLog[]) => void,
  onError: (error: Error) => void,
  max: number | null = 2000,
) {
  const constraints: QueryConstraint[] = [orderBy("date", "desc")];
  if (max != null) constraints.push(limit(max));
  const recent = query(waterCollection(uid), ...constraints);
  return onSnapshot(
    recent,
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            date: (data.date as string | undefined) ?? "",
            ml: (data.ml as number | undefined) ?? 0,
            time: (data.time as string | undefined) ?? "",
            label: (data.label as string | undefined) ?? null,
            createdAt: (data.createdAt as Timestamp | undefined) ?? null,
          };
        }),
      );
    },
    onError,
  );
}

export async function addWaterLog(uid: string, input: WaterLogInput) {
  await addDoc(waterCollection(uid), {
    date: input.date,
    ml: input.ml,
    time: input.time,
    label: input.label ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function deleteWaterLog(uid: string, id: string) {
  await deleteDoc(doc(waterCollection(uid), id));
}
