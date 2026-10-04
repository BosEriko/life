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
import { watchDailies, type DailyEntry } from "@/models/users/dailies";
import { watchHabits, type HabitEntry } from "@/models/users/habits";
import { watchBpReadings, type BpReading } from "@/models/users/bp-readings";
import { watchWaterLogs, type WaterLog } from "@/models/users/water-logs";
import { watchIntake, type IntakeEntry } from "@/models/users/intake";
import { EMPTY_IDEALS, watchIdeals, type Ideals } from "@/models/users/ideals";
import { watchWaterPresets, type WaterPreset } from "@/models/users/presets";
import { watchTaskSettings, watchTaskChecks, type TaskChecks } from "@/models/users/tasks";
import type { Task } from "@/lib/task-schedule";
import { watchTodoSettings, watchTodos } from "@/models/users/todos";
import type { Todo, TodoList } from "@/lib/todos";
import { DEFAULT_EMERGENCY_FUND_MONTHS, type FinanceAccount, type FinanceRecord } from "@/lib/finance";
import { watchFinanceAccounts, watchFinanceRecords } from "@/models/users/finance";

type HealthData = {
  financeAccounts: FinanceAccount[];
  financeAccountsLocked: boolean;
  financeLastRecalculatedAt: string | null;
  financeEmergencyFundMonths: number;
  financeRecords: FinanceRecord[];
  financeReady: boolean;
  financeError: boolean;
  todos: Todo[];
  todoLists: TodoList[];
  todosReady: boolean;
  todoError: boolean;
  tasks: Task[];
  taskChecks: TaskChecks[];
  tasksReady: boolean;
  taskChecksReady: boolean;
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
  financeAccounts: [],
  financeAccountsLocked: false,
  financeLastRecalculatedAt: null,
  financeEmergencyFundMonths: DEFAULT_EMERGENCY_FUND_MONTHS,
  financeRecords: [],
  financeReady: false,
  financeError: false,
  todos: [],
  todoLists: [],
  todosReady: false,
  todoError: false,
  tasks: [],
  taskChecks: [],
  tasksReady: false,
  taskChecksReady: false,
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskChecks, setTaskChecks] = useState<TaskChecks[]>([]);
  const [tasksReady, setTasksReady] = useState(false);
  const [taskChecksReady, setTaskChecksReady] = useState(false);
  const [todoRecords, setTodoRecords] = useState<{ uid: string; rows: Todo[] } | null>(null);
  const [todoSettings, setTodoSettings] = useState<{ uid: string; lists: TodoList[] } | null>(null);
  const [todoFailure, setTodoFailure] = useState<string | null>(null);
  const [financeAccountsState, setFinanceAccountsState] = useState<{ uid: string; rows: FinanceAccount[]; locked: boolean; lastRecalculatedAt: string | null; emergencyFundMonths: number } | null>(null);
  const [financeRecordsState, setFinanceRecordsState] = useState<{ uid: string; rows: FinanceRecord[] } | null>(null);
  const [financeFailure, setFinanceFailure] = useState<string | null>(null);
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
      watchFinanceAccounts(user.uid, (rows, settings) => setFinanceAccountsState({ uid: user.uid, rows, locked: settings.accountsLocked, lastRecalculatedAt: settings.lastRecalculatedAt, emergencyFundMonths: settings.emergencyFundMonths }), () => setFinanceFailure(user.uid)),
      watchFinanceRecords(user.uid, cutoff, (rows) => setFinanceRecordsState({ uid: user.uid, rows }), () => setFinanceFailure(user.uid)),
      watchTodos(user.uid, cutoff, (rows) => setTodoRecords({ uid: user.uid, rows }), () => setTodoFailure(user.uid)),
      watchTodoSettings(user.uid, (lists) => setTodoSettings({ uid: user.uid, lists }), () => setTodoFailure(user.uid)),
      watchTaskSettings(user.uid, (rows) => { setTasks(rows); setTasksReady(true); }, fail),
      watchTaskChecks(user.uid, cutoff, (rows) => { setTaskChecks(rows); setTaskChecksReady(true); }, fail),
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
      financeAccounts: financeAccountsState?.uid === user?.uid ? financeAccountsState?.rows ?? [] : [],
      financeAccountsLocked: financeAccountsState?.uid === user?.uid ? financeAccountsState?.locked ?? false : false,
      financeLastRecalculatedAt: financeAccountsState?.uid === user?.uid ? financeAccountsState?.lastRecalculatedAt ?? null : null,
      financeEmergencyFundMonths: financeAccountsState?.uid === user?.uid ? financeAccountsState?.emergencyFundMonths ?? DEFAULT_EMERGENCY_FUND_MONTHS : DEFAULT_EMERGENCY_FUND_MONTHS,
      financeRecords: financeRecordsState?.uid === user?.uid ? financeRecordsState?.rows ?? [] : [],
      financeReady: !!user && financeAccountsState?.uid === user.uid && financeRecordsState?.uid === user.uid,
      financeError: !!user && financeFailure === user.uid,
      todos: todoRecords?.uid === user?.uid ? todoRecords?.rows ?? [] : [],
      todoLists: todoSettings?.uid === user?.uid ? todoSettings?.lists ?? [] : [],
      todosReady: !!user && todoRecords?.uid === user.uid && todoSettings?.uid === user.uid,
      todoError: !!user && todoFailure === user.uid,
      tasks,
      taskChecks,
      tasksReady,
      taskChecksReady,
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
      user,
      financeAccountsState,
      financeRecordsState,
      financeFailure,
      todoRecords,
      todoSettings,
      todoFailure,
      tasks,
      taskChecks,
      tasksReady,
      taskChecksReady,
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
