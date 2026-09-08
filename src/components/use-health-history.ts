"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getDocsFromCache,
  orderBy,
  query,
  where,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { getFirebaseDb } from "@/lib/firebase";
import { mapDailyDoc, type DailyEntry } from "@/models/dailies";
import { mapHabitDoc, type HabitEntry } from "@/models/habits";
import { mapBpDoc, type BpReading } from "@/models/bp";
import { mapWaterDoc, type WaterLog } from "@/models/water";
import { mapIntakeDoc, type IntakeEntry } from "@/models/intake";

type HistoryData = {
  dailies: DailyEntry[];
  habits: HabitEntry[];
  bpReadings: BpReading[];
  waterLogs: WaterLog[];
  intake: IntakeEntry[];
};

export type HealthHistory = HistoryData & { ready: boolean };

const EMPTY_DATA: HistoryData = {
  dailies: [],
  habits: [],
  bpReadings: [],
  waterLogs: [],
  intake: [],
};

const DISABLED: HealthHistory = { ...EMPTY_DATA, ready: true };
const LOADING: HealthHistory = { ...EMPTY_DATA, ready: false };

const cache = new Map<string, Promise<HistoryData>>();

async function pull<T>(
  built: Query,
  map: (snap: QueryDocumentSnapshot<DocumentData>) => T,
): Promise<T[]> {
  try {
    const cached = await getDocsFromCache(built);
    if (!cached.empty) return cached.docs.map(map);
  } catch {
    // no local cache — fall through to the server
  }
  const fresh = await getDocs(built);
  return fresh.docs.map(map);
}

async function loadHistory(uid: string, cutoff: string): Promise<HistoryData> {
  const db = getFirebaseDb();
  const slice = (name: string) =>
    query(
      collection(db, "users", uid, name),
      where("date", "<", cutoff),
      orderBy("date", "desc"),
    );
  const [dailies, habits, bpReadings, waterLogs, intake] = await Promise.all([
    pull(slice("dailies"), mapDailyDoc),
    pull(slice("habits"), mapHabitDoc),
    pull(slice("bpReadings"), mapBpDoc),
    pull(slice("waterLogs"), mapWaterDoc),
    pull(slice("intake"), mapIntakeDoc),
  ]);
  return { dailies, habits, bpReadings, waterLogs, intake };
}

export function useHealthHistory(
  enabled: boolean,
  cutoff: string,
): HealthHistory {
  const { user } = useAuth();
  const key = enabled && user && cutoff ? `${user.uid}|${cutoff}` : null;
  const [loaded, setLoaded] = useState<{ key: string; data: HistoryData } | null>(
    null,
  );

  useEffect(() => {
    if (!key || !user || !cutoff) return;
    let alive = true;
    if (!cache.has(key)) cache.set(key, loadHistory(user.uid, cutoff));
    cache
      .get(key)!
      .then((data) => {
        if (alive) setLoaded({ key, data });
      })
      .catch(() => {
        cache.delete(key);
        if (alive) setLoaded({ key, data: EMPTY_DATA });
      });
    return () => {
      alive = false;
    };
  }, [key, user, cutoff]);

  if (!key) return DISABLED;
  if (loaded?.key === key) return { ...loaded.data, ready: true };
  return LOADING;
}
