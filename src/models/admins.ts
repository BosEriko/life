import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export function watchAdminRole(
  uid: string,
  onChange: (isAdmin: boolean) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(getFirebaseDb(), "admins", uid),
    (snap) => onChange(snap.data()?.admin === true),
    onError,
  );
}
