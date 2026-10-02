"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { watchDailyDoc, type DailyEntry } from "@/models/users/dailies";
import { watchHabitDoc, type HabitEntry } from "@/models/users/habits";
import { watchBpForDate, type BpReading } from "@/models/users/bp-readings";
import { watchWaterForDate, type WaterLog } from "@/models/users/water-logs";
import { watchIntakeForDate, type IntakeEntry } from "@/models/users/intake";
import { watchTaskDay, type TaskChecks } from "@/models/users/tasks";
import { useHealthData } from "@/components/health-data-provider";
import { watchTodosForDate } from "@/models/users/todos";
import type { Todo } from "@/lib/todos";
import type { FinanceRecord } from "@/lib/finance";
import { watchFinanceDay } from "@/models/users/finance";

export function useFinanceDay(date: string, enabled: boolean) {
  const { user } = useAuth();
  const { financeRecords, financeReady, financeError, cutoff } = useHealthData();
  const inWindow = !!cutoff && date >= cutoff;
  const [state, setState] = useState<{ uid: string; date: string; rows: FinanceRecord[]; error: boolean } | null>(null);
  useEffect(() => {
    if (!enabled || !user || inWindow) return;
    return watchFinanceDay(user.uid, date, (rows) => setState({ uid: user.uid, date, rows, error: false }), () => setState({ uid: user.uid, date, rows: [], error: true }));
  }, [enabled, user, date, inWindow]);
  if (!enabled) return { rows: [], ready: false, error: false };
  if (inWindow) return { rows: financeRecords.filter((record) => record.date === date), ready: financeReady, error: financeError };
  const current = state?.uid === user?.uid && state?.date === date;
  return { rows: current ? state!.rows : [], ready: current, error: current && state!.error };
}

export function useTodoDay(date: string, enabled: boolean) {
  const { user } = useAuth();
  const { todos, todosReady, cutoff, todoError } = useHealthData();
  const inWindow = !!cutoff && date >= cutoff;
  const [state, setState] = useState<{ uid: string; date: string; rows: Todo[]; error: boolean } | null>(null);
  useEffect(() => {
    if (!enabled || !user || inWindow) return;
    return watchTodosForDate(user.uid, date,
      (rows) => setState({ uid: user.uid, date, rows, error: false }),
      () => setState({ uid: user.uid, date, rows: [], error: true }));
  }, [enabled, user, date, inWindow]);
  if (!enabled) return { rows: [], ready: false, error: false };
  if (inWindow) return { rows: todos.filter((todo) => todo.date === date), ready: todosReady, error: todoError };
  const current = state?.uid === user?.uid && state?.date === date;
  return { rows: current ? state!.rows : [], ready: current, error: current && state!.error };
}

export function useTaskDay(date: string, enabled: boolean) {
  const { user } = useAuth();
  const { cutoff, taskChecks, taskChecksReady } = useHealthData();
  const inWindow = !!cutoff && date >= cutoff;
  const [state, setState] = useState<{ uid: string; row: TaskChecks } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !user || inWindow) return;
    return watchTaskDay(user.uid, date, (row) => {
      setState({ uid: user.uid, row });
      setError(null);
    }, () => setError(date));
  }, [user, date, enabled, inWindow]);
  if (enabled && inWindow) return {
    row: taskChecksReady ? taskChecks.find((entry) => entry.date === date) ?? { date, completed: {} } : null,
    error: false,
  };
  return {
    row: enabled && state?.uid === user?.uid && state?.row.date === date ? state.row : null,
    error: error === date,
  };
}

const NO_BP: BpReading[] = [];
const NO_WATER: WaterLog[] = [];
const NO_INTAKE: IntakeEntry[] = [];

export function useDailyDoc(
  dateKey: string,
  enabled: boolean,
): DailyEntry | null {
  const { user } = useAuth();
  const [state, setState] = useState<{
    key: string;
    entry: DailyEntry | null;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !user || !dateKey) return;
    const key = dateKey;
    return watchDailyDoc(
      user.uid,
      key,
      (entry) => setState({ key, entry }),
      () => {},
    );
  }, [enabled, user, dateKey]);

  return enabled && state?.key === dateKey ? state.entry : null;
}

export function useHabitDoc(
  dateKey: string,
  enabled: boolean,
): HabitEntry | null {
  const { user } = useAuth();
  const [state, setState] = useState<{
    key: string;
    entry: HabitEntry | null;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !user || !dateKey) return;
    const key = dateKey;
    return watchHabitDoc(
      user.uid,
      key,
      (entry) => setState({ key, entry }),
      () => {},
    );
  }, [enabled, user, dateKey]);

  return enabled && state?.key === dateKey ? state.entry : null;
}

export function useDayBp(dateKey: string, enabled: boolean): BpReading[] {
  const { user } = useAuth();
  const [state, setState] = useState<{ key: string; rows: BpReading[] }>({
    key: "",
    rows: NO_BP,
  });

  useEffect(() => {
    if (!enabled || !user || !dateKey) return;
    const key = dateKey;
    return watchBpForDate(
      user.uid,
      key,
      (rows) => setState({ key, rows }),
      () => {},
    );
  }, [enabled, user, dateKey]);

  return enabled && state.key === dateKey ? state.rows : NO_BP;
}

export function useDayWater(dateKey: string, enabled: boolean): WaterLog[] {
  const { user } = useAuth();
  const [state, setState] = useState<{ key: string; rows: WaterLog[] }>({
    key: "",
    rows: NO_WATER,
  });

  useEffect(() => {
    if (!enabled || !user || !dateKey) return;
    const key = dateKey;
    return watchWaterForDate(
      user.uid,
      key,
      (rows) => setState({ key, rows }),
      () => {},
    );
  }, [enabled, user, dateKey]);

  return enabled && state.key === dateKey ? state.rows : NO_WATER;
}

export function useDayIntake(dateKey: string, enabled: boolean): IntakeEntry[] {
  const { user } = useAuth();
  const [state, setState] = useState<{ key: string; rows: IntakeEntry[] }>({
    key: "",
    rows: NO_INTAKE,
  });

  useEffect(() => {
    if (!enabled || !user || !dateKey) return;
    const key = dateKey;
    return watchIntakeForDate(
      user.uid,
      key,
      (rows) => setState({ key, rows }),
      () => {},
    );
  }, [enabled, user, dateKey]);

  return enabled && state.key === dateKey ? state.rows : NO_INTAKE;
}
