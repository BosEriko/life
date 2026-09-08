"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { App } from "antd";
import { useAuth } from "@/components/auth-provider";
import { healthWindowCutoff } from "@/lib/health-window";
import { watchDailies, type DailyEntry } from "@/models/dailies";
import { watchHabits, type HabitEntry } from "@/models/habits";
import { watchBpReadings, type BpReading } from "@/models/bp";
import { watchWaterLogs, type WaterLog } from "@/models/water";
import { watchIntake, type IntakeEntry } from "@/models/intake";
import { EMPTY_IDEALS, watchIdeals, type Ideals } from "@/models/ideals";
import { watchWaterPresets, type WaterPreset } from "@/models/presets";

type HealthData = {
  dailies: DailyEntry[];
  habits: HabitEntry[];
  bpReadings: BpReading[];
  waterLogs: WaterLog[];
  intake: IntakeEntry[];
  ideals: Ideals;
  presets: WaterPreset[];
  cutoff: string;
  ready: boolean;
};

const HealthDataContext = createContext<HealthData>({
  dailies: [],
  habits: [],
  bpReadings: [],
  waterLogs: [],
  intake: [],
  ideals: EMPTY_IDEALS,
  presets: [],
  cutoff: "",
  ready: false,
});

export function useHealthData(): HealthData {
  return useContext(HealthDataContext);
}

export function HealthDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [cutoff] = useState(healthWindowCutoff);
  const [dailies, setDailies] = useState<DailyEntry[]>([]);
  const [habits, setHabits] = useState<HabitEntry[]>([]);
  const [bpReadings, setBpReadings] = useState<BpReading[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [intake, setIntake] = useState<IntakeEntry[]>([]);
  const [ideals, setIdeals] = useState<Ideals>(EMPTY_IDEALS);
  const [presets, setPresets] = useState<WaterPreset[]>([]);
  const [ready, setReady] = useState(false);
  const seen = useRef({
    dailies: false,
    habits: false,
    bp: false,
    water: false,
    intake: false,
  });
  const errored = useRef(false);

  useEffect(() => {
    if (!user) return;
    const marks = seen.current;
    const markSeen = (key: keyof typeof marks) => {
      marks[key] = true;
      if (
        marks.dailies &&
        marks.habits &&
        marks.bp &&
        marks.water &&
        marks.intake
      ) {
        setReady(true);
      }
    };
    const fail = () => {
      if (!errored.current) {
        errored.current = true;
        message.error("Could not load your data.");
      }
    };

    const unsubscribers = [
      watchDailies(
        user.uid,
        (next) => {
          setDailies(next);
          markSeen("dailies");
        },
        fail,
        null,
        cutoff,
      ),
      watchHabits(
        user.uid,
        (next) => {
          setHabits(next);
          markSeen("habits");
        },
        fail,
        null,
        cutoff,
      ),
      watchBpReadings(
        user.uid,
        (next) => {
          setBpReadings(next);
          markSeen("bp");
        },
        fail,
        null,
        cutoff,
      ),
      watchWaterLogs(
        user.uid,
        (next) => {
          setWaterLogs(next);
          markSeen("water");
        },
        fail,
        null,
        cutoff,
      ),
      watchIntake(
        user.uid,
        (next) => {
          setIntake(next);
          markSeen("intake");
        },
        fail,
        null,
        cutoff,
      ),
      watchIdeals(user.uid, setIdeals, () => {}),
      watchWaterPresets(user.uid, setPresets, () => {}),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [user, cutoff, message]);

  const value = useMemo<HealthData>(
    () => ({
      dailies,
      habits,
      bpReadings,
      waterLogs,
      intake,
      ideals,
      presets,
      cutoff,
      ready,
    }),
    [
      dailies,
      habits,
      bpReadings,
      waterLogs,
      intake,
      ideals,
      presets,
      cutoff,
      ready,
    ],
  );

  return (
    <HealthDataContext.Provider value={value}>
      {children}
    </HealthDataContext.Provider>
  );
}
