"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { watchDailyDoc, type DailyEntry } from "@/models/dailies";
import { watchBpForDate, type BpReading } from "@/models/bp";
import { watchWaterForDate, type WaterLog } from "@/models/water";
import { watchIntakeForDate, type IntakeEntry } from "@/models/intake";

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
