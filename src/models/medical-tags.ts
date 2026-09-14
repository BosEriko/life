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

export type MedicalTag = { id: string; category: string; label: string };

export const COMMON_CATEGORIES = [
  "Allergy",
  "Medication",
  "Condition",
  "Blood type",
  "Other",
];

function medicalTagsCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "medicalTags");
}

export function watchMedicalTags(
  uid: string,
  onChange: (tags: MedicalTag[]) => void,
  onError: (error: Error) => void,
) {
  const ordered = query(medicalTagsCollection(uid), orderBy("createdAt", "asc"));
  return onSnapshot(
    ordered,
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            category: (data.category as string | undefined) ?? "",
            label: (data.label as string | undefined) ?? "",
          };
        }),
      );
    },
    onError,
  );
}

export async function addMedicalTag(
  uid: string,
  category: string,
  label: string,
) {
  await addDoc(medicalTagsCollection(uid), {
    category,
    label,
    createdAt: serverTimestamp(),
  });
}

export async function deleteMedicalTag(uid: string, id: string) {
  await deleteDoc(doc(medicalTagsCollection(uid), id));
}
