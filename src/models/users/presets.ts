import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export type WaterPreset = { id: string; name: string; ml: number };

function presetsCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "presets");
}

export function watchWaterPresets(
  uid: string,
  onChange: (presets: WaterPreset[]) => void,
  onError: (error: Error) => void,
) {
  const ordered = query(presetsCollection(uid), orderBy("ml", "asc"));
  return onSnapshot(
    ordered,
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            name: (data.name as string | undefined) ?? "",
            ml: (data.ml as number | undefined) ?? 0,
          };
        }),
      );
    },
    onError,
  );
}

export async function addWaterPreset(uid: string, name: string, ml: number) {
  await addDoc(presetsCollection(uid), {
    name,
    ml,
    createdAt: serverTimestamp(),
  });
}

export async function deleteWaterPreset(uid: string, id: string) {
  await deleteDoc(doc(presetsCollection(uid), id));
}
