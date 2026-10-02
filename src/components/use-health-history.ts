"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  getDocFromServer,
  doc,
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
import { mapTaskChecks, type TaskChecks } from "@/models/tasks";
import { mapTodoDoc } from "@/models/todos";
import type { Todo } from "@/lib/todos";
import type { FinanceRecord } from "@/lib/finance";
import { mapFinanceRecord } from "@/models/finance";

type HistoryData = {
  taskChecks: TaskChecks[];
  dailies: DailyEntry[];
  habits: HabitEntry[];
  bpReadings: BpReading[];
  waterLogs: WaterLog[];
  intake: IntakeEntry[];
};

export type HealthHistory = HistoryData & { ready: boolean };

const EMPTY_DATA: HistoryData = {
  taskChecks: [],
  dailies: [],
  habits: [],
  bpReadings: [],
  waterLogs: [],
  intake: [],
};

const DISABLED: HealthHistory = { ...EMPTY_DATA, ready: true };
const LOADING: HealthHistory = { ...EMPTY_DATA, ready: false };

const cache = new Map<string, Promise<HistoryData>>();

function pullTodoHistory(uid: string, cutoff: string): Promise<Todo[]> {
  return pull(query(collection(getFirebaseDb(), "users", uid, "todos"), where("date", "<", cutoff), orderBy("date", "desc")), mapTodoDoc).catch(() => []);
}

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
  const [dailies, habits, bpReadings, waterLogs, intake, taskChecks] = await Promise.all([
    pull(slice("dailies"), mapDailyDoc),
    pull(slice("habits"), mapHabitDoc),
    pull(slice("bpReadings"), mapBpDoc),
    pull(slice("waterLogs"), mapWaterDoc),
    pull(slice("intake"), mapIntakeDoc),
    pull(slice("taskChecks"), mapTaskChecks).catch(() => []),
  ]);
  return { dailies, habits, bpReadings, waterLogs, intake, taskChecks };
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

const todoCache = new Map<string, Promise<Todo[]>>();
const NO_TODOS: Todo[] = [];

const financeCache = new Map<string, Promise<FinanceRecord[]>>();
const NO_FINANCE: FinanceRecord[] = [];

export function useFinanceHistory(enabled: boolean, cutoff: string) {
  const { user } = useAuth();
  const key = enabled && user && cutoff ? `${user.uid}|${cutoff}` : null;
  const [loaded, setLoaded] = useState<{ key: string; rows: FinanceRecord[] } | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const load = useCallback(() => {
    if (!user || !cutoff) return Promise.resolve(NO_FINANCE);
    return pull(query(collection(getFirebaseDb(), "users", user.uid, "financeRecords"), where("date", "<", cutoff), orderBy("date", "desc")), mapFinanceRecord);
  }, [user, cutoff]);
  useEffect(() => {
    if (!key) return;
    let alive = true;
    if (!financeCache.has(key)) financeCache.set(key, load());
    financeCache.get(key)!.then((rows) => { if (alive) setLoaded({ key, rows }); }).catch(() => { financeCache.delete(key); if (alive) setErrorKey(key); });
    return () => { alive = false; };
  }, [key, load]);
  const refresh = useCallback(() => {
    if (!key) {
      if (user && cutoff) financeCache.delete(`${user.uid}|${cutoff}`);
      return;
    }
    const next = load();
    financeCache.set(key, next);
    next.then((rows) => { setLoaded({ key, rows }); setErrorKey(null); }).catch(() => { financeCache.delete(key); setErrorKey(key); });
  }, [key, load, user, cutoff]);
  const forRecalculation = useCallback(async () => {
    if (!user || !cutoff) throw new Error("Sign in to recalculate.");
    const db = getFirebaseDb();
    const settings = await getDocFromServer(doc(db, "users", user.uid, "financeSettings", "current"));
    const collectionRef = collection(db, "users", user.uid, "financeRecords");
    const [old, recent] = await Promise.all([
      getDocsFromServer(query(collectionRef, where("date", "<", cutoff), orderBy("date", "desc"))),
      getDocsFromServer(query(collectionRef, where("date", ">=", cutoff), orderBy("date", "desc"))),
    ]);
    if (settings.metadata.hasPendingWrites || old.metadata.hasPendingWrites || recent.metadata.hasPendingWrites) throw new Error("Wait for your records to sync before recalculating.");
    return { records: [...old.docs, ...recent.docs].map(mapFinanceRecord), revision: settings.data()?.revision ?? 0 };
  }, [user, cutoff]);
  return { rows: key && loaded?.key === key ? loaded.rows : NO_FINANCE, ready: !key || loaded?.key === key, error: !!key && errorKey === key, refresh, forRecalculation };
}

export function useTodoHistory(enabled: boolean, cutoff: string) {
  const { user } = useAuth();
  const key = enabled && user && cutoff ? `${user.uid}|${cutoff}` : null;
  const [loaded, setLoaded] = useState<{ key: string; todos: Todo[] } | null>(null);

  useEffect(() => {
    if (!key || !user) return;
    let alive = true;
    if (!todoCache.has(key)) todoCache.set(key, pullTodoHistory(user.uid, cutoff));
    todoCache.get(key)!.then((todos) => {
      if (alive) setLoaded({ key, todos });
    });
    return () => { alive = false; };
  }, [key, user, cutoff]);

  const refresh = useCallback(() => {
    if (!key || !user) return;
    const next = pullTodoHistory(user.uid, cutoff);
    todoCache.set(key, next);
    next.then((todos) => setLoaded({ key, todos }));
  }, [key, user, cutoff]);

  return { todos: key && loaded?.key === key ? loaded.todos : NO_TODOS, ready: !key || loaded?.key === key, refresh };
}
