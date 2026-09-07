import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

const ALERT_DOC = "adminAlerts/anthropicCredits";

export async function setAnthropicCreditAlert(
  exhausted: boolean,
  message: string | null,
): Promise<void> {
  try {
    await getAdminDb()
      .doc(ALERT_DOC)
      .set(
        {
          exhausted,
          message: exhausted ? message : null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch {
    // best-effort; never block the caller on the alert write
  }
}
