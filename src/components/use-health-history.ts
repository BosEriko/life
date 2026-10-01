"use client";

import { useCallback, useEffect, useState } from "react";
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
import { mapTaskChecks, type TaskChecks } from "@/models/tasks";
import { mapTodoDoc } from "@/models/todos";
import type { Todo } from "@/lib/todos";

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
