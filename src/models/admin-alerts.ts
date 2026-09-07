import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export type CreditAlert = {
  exhausted: boolean;
  message: string | null;
  updatedAt: string | null;
};

export function watchAnthropicCreditAlert(
  onChange: (alert: CreditAlert) => void,
  onError?: (error: unknown) => void,
) {
  return onSnapshot(
    doc(getFirebaseDb(), "adminAlerts", "anthropicCredits"),
    (snapshot) => {
      const data = snapshot.data();
      const updated = data?.updatedAt;
      onChange({
        exhausted: data?.exhausted === true,
        message: (data?.message as string | undefined) ?? null,
        updatedAt:
          updated && typeof updated.toDate === "function"
            ? updated.toDate().toISOString()
            : null,
      });
    },
    onError,
  );
}
