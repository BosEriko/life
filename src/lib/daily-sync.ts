import { getDocFromServer, type Timestamp } from "firebase/firestore";
import {
  getOutboxItem,
  listOutboxItems,
  removeOutboxItem,
  writeOutboxItem,
} from "@/lib/daily-outbox";
import { dailyDocRef, saveDaily, type DailyInput } from "@/models/dailies";

export type DailyConflict = {
  date: string;
  mine: DailyInput;
  cloud: Record<string, unknown> | null;
};

export async function queueDailySave(
  uid: string,
  date: string,
  input: DailyInput,
  baselineUpdatedAtMs: number | null,
): Promise<boolean> {
  if (navigator.onLine) {
    await saveDaily(uid, date, input);
    return false;
  }
  writeOutboxItem(uid, date, input, baselineUpdatedAtMs);
  return true;
}

export function getQueuedDailyInput(uid: string, date: string): DailyInput | null {
  return getOutboxItem(uid, date)?.input ?? null;
}

export async function syncOutbox(uid: string): Promise<DailyConflict[]> {
  const items = listOutboxItems(uid);
  const conflicts: DailyConflict[] = [];

  for (const item of items) {
    const snapshot = await getDocFromServer(dailyDocRef(uid, item.date));
    const data = snapshot.exists() ? snapshot.data() : null;
    const serverUpdatedAtMs =
      (data?.updatedAt as Timestamp | undefined)?.toMillis() ?? null;

    if (serverUpdatedAtMs === item.baseUpdatedAtMs) {
      await saveDaily(uid, item.date, item.input);
      removeOutboxItem(uid, item.date);
    } else {
      conflicts.push({ date: item.date, mine: item.input, cloud: data });
    }
  }

  return conflicts;
}

export async function resolveConflict(
  uid: string,
  date: string,
  choice: "mine" | "cloud",
  mine: DailyInput,
) {
  if (choice === "mine") {
    await saveDaily(uid, date, mine);
  }
  removeOutboxItem(uid, date);
}
