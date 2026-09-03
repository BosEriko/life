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

export type WeightEntry = {
  date: string;
  kg: number;
  updatedAt: Timestamp | null;
};

function weightsCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "weights");
}

export function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function saveWeight(uid: string, date: string, kg: number) {
  await setDoc(doc(weightsCollection(uid), date), {
    date,
    kg,
    updatedAt: serverTimestamp(),
  });
}

export function watchWeights(
  uid: string,
  onChange: (entries: WeightEntry[]) => void,
  onError: (error: Error) => void,
) {
  const recent = query(
    weightsCollection(uid),
    orderBy("date", "desc"),
    limit(30),
  );
  return onSnapshot(
    recent,
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            date: data.date as string,
            kg: data.kg as number,
            updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
          };
        }),
      );
    },
    onError,
  );
}
