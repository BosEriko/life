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
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
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

export function mapBpDoc(snap: QueryDocumentSnapshot<DocumentData>): BpReading {
  const data = snap.data();
  return {
    id: snap.id,
    date: (data.date as string | undefined) ?? "",
    systolic: (data.systolic as number | undefined) ?? 0,
    diastolic: (data.diastolic as number | undefined) ?? 0,
    time: (data.time as string | undefined) ?? "",
    posture: (data.posture as BpPosture | undefined) ?? "sitting",
    arm: (data.arm as BpArm | undefined) ?? "left",
    createdAt: (data.createdAt as Timestamp | undefined) ?? null,
  };
}

export function watchBpReadings(
  uid: string,
  onChange: (readings: BpReading[]) => void,
  onError: (error: Error) => void,
  max: number | null = 2000,
  sinceDate: string | null = null,
) {
  const constraints: QueryConstraint[] = [orderBy("date", "desc")];
  if (sinceDate != null) constraints.push(where("date", ">=", sinceDate));
  if (max != null) constraints.push(limit(max));
  const recent = query(bpCollection(uid), ...constraints);
  return onSnapshot(
    recent,
    (snapshot) => {
      onChange(snapshot.docs.map(mapBpDoc));
    },
    onError,
  );
}

export function watchBpForDate(
  uid: string,
  date: string,
  onChange: (readings: BpReading[]) => void,
  onError: (error: Error) => void,
) {
  const byDate = query(bpCollection(uid), where("date", "==", date));
  return onSnapshot(
    byDate,
    (snapshot) => {
      onChange(snapshot.docs.map(mapBpDoc));
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
