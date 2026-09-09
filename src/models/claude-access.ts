import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export function watchClaudeAccess(
  uid: string,
  onChange: (enabled: boolean) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(getFirebaseDb(), "claudeAccess", uid),
    (snap) => onChange(snap.data()?.enabled === true),
    onError,
  );
}
