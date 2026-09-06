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
import { dailyBpAverages, type DailyBp } from "@/lib/bp-average";

export { dailyBpAverages };
export type { DailyBp };

export type BpPosture = "sitting" | "standing";
export type BpArm = "left" | "right";

export type BpReading = {
  id: string;
  date: string;
  systolic: number;
  diastolic: number;
  time: string;
  posture: BpPosture;
  arm: BpArm;
  createdAt: Timestamp | null;
};

export type BpReadingInput = {
  date: string;
  systolic: number;
  diastolic: number;
  time: string;
  posture: BpPosture;
  arm: BpArm;
};

function bpCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "bpReadings");
}

export function formatBpTime(dateKey: string, time: string): string {
  return dayjs(`${dateKey}T${time}`).format("h:mm A");
}

export function watchBpReadings(
  uid: string,
  onChange: (readings: BpReading[]) => void,
  onError: (error: Error) => void,
  max = 2000,
) {
  const recent = query(
    bpCollection(uid),
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
            systolic: (data.systolic as number | undefined) ?? 0,
            diastolic: (data.diastolic as number | undefined) ?? 0,
            time: (data.time as string | undefined) ?? "",
            posture: (data.posture as BpPosture | undefined) ?? "sitting",
            arm: (data.arm as BpArm | undefined) ?? "left",
            createdAt: (data.createdAt as Timestamp | undefined) ?? null,
          };
        }),
      );
    },
    onError,
  );
}

export async function addBpReading(uid: string, input: BpReadingInput) {
  await addDoc(bpCollection(uid), { ...input, createdAt: serverTimestamp() });
}

export async function deleteBpReading(uid: string, id: string) {
  await deleteDoc(doc(bpCollection(uid), id));
}
