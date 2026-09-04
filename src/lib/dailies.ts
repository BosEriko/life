import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export type BpPosture = "sitting" | "standing";
export type BpArm = "left" | "right";

export type DailyEntry = {
  date: string;
  weight: number | null;
  systolic: number | null;
  diastolic: number | null;
  bpTime: string | null;
  bpPosture: BpPosture | null;
  bpArm: BpArm | null;
  water: number | null;
  updatedAt: Timestamp | null;
};

export type DailyInput = {
  weight?: number;
  systolic?: number;
  diastolic?: number;
  bpTime?: string;
  bpPosture?: BpPosture;
  bpArm?: BpArm;
  water?: number;
};

function dailiesCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "dailies");
}

export function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function saveDaily(uid: string, date: string, input: DailyInput) {
  const payload: Record<string, unknown> = {
    date,
    updatedAt: serverTimestamp(),
  };
  if (input.weight !== undefined) payload.weight = input.weight;
  if (input.systolic !== undefined) payload.systolic = input.systolic;
  if (input.diastolic !== undefined) payload.diastolic = input.diastolic;
  if (input.bpTime !== undefined) payload.bpTime = input.bpTime;
  if (input.bpPosture !== undefined) payload.bpPosture = input.bpPosture;
  if (input.bpArm !== undefined) payload.bpArm = input.bpArm;
  if (input.water !== undefined) payload.water = input.water;

  await setDoc(doc(dailiesCollection(uid), date), payload, { merge: true });
}

export function watchDailies(
  uid: string,
  onChange: (entries: DailyEntry[]) => void,
  onError: (error: Error) => void,
  max = 30,
) {
  const recent = query(
    dailiesCollection(uid),
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
            date: data.date as string,
            weight: (data.weight as number | undefined) ?? null,
            systolic: (data.systolic as number | undefined) ?? null,
            diastolic: (data.diastolic as number | undefined) ?? null,
            bpTime: (data.bpTime as string | undefined) ?? null,
            bpPosture: (data.bpPosture as BpPosture | undefined) ?? null,
            bpArm: (data.bpArm as BpArm | undefined) ?? null,
            water: (data.water as number | undefined) ?? null,
            updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
          };
        }),
      );
    },
    onError,
  );
}
