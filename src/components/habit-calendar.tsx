"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { App, Flex, Grid, Spin, theme, Typography } from "antd";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import {
  TERRACOTTA,
  TERRACOTTA_DARK,
  useIsDark,
} from "@/components/theme-provider";
import { todayKey, watchDailies, type DailyEntry } from "@/models/dailies";
import {
  dailyIntake,
  watchIntake,
  type DailyIntake,
  type IntakeEntry,
} from "@/models/intake";

const WEEKS = 26;
const CELL = 11;
const GAP = 3;
const HISTORY_LIMIT = 220;
const INTAKE_LIMIT = 4000;

type DailyHabit = "bath" | "brushTeeth";
type IntakeHabit = "junkFood" | "junkDrink";

type Habit =
  | { key: DailyHabit; label: ReactNode; tone: "good"; source: "daily" }
  | { key: IntakeHabit; label: ReactNode; tone: "bad"; source: "intake" };

const HABIT_GROUPS: { title: string; habits: Habit[] }[] = [
  {
    title: "Hygiene",
    habits: [
      {
        key: "bath",
        label: (
          <>
            <Icon name="bath" />
            Bath
          </>
        ),
        tone: "good",
        source: "daily",
      },
      {
        key: "brushTeeth",
        label: (
          <>
            <Icon name="brush" />
            Brush
          </>
        ),
        tone: "good",
        source: "daily",
      },
    ],
  },
  {
    title: "Junk",
    habits: [
      {
        key: "junkFood",
        label: (
          <>
            <Icon name="junkFood" />
            Junk food
          </>
        ),
        tone: "bad",
        source: "intake",
      },
      {
        key: "junkDrink",
        label: (
          <>
            <Icon name="junkDrink" />
            Junk drink
          </>
        ),
        tone: "bad",
        source: "intake",
      },
    ],
  },
];

const ALL_HABITS: Habit[] = HABIT_GROUPS.flatMap((group) => group.habits);

export function HabitCalendar() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const isDark = useIsDark();
  const badColor = isDark ? TERRACOTTA_DARK : TERRACOTTA;
  const screens = Grid.useBreakpoint();
  const hoverTips = screens.md !== false;

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [intake, setIntake] = useState<IntakeEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    if (!user) return;
    return watchDailies(
      user.uid,
      (next) => {
        setEntries(next);
        setLoaded(true);
      },
      () => {
        message.error("Could not load your habits.");
        setLoaded(true);
      },
      HISTORY_LIMIT,
    );
  }, [user, message]);

  useEffect(() => {
    if (!user) return;
    return watchIntake(user.uid, setIntake, () => {}, INTAKE_LIMIT);
  }, [user]);

  const byDate = useMemo(() => {
    const map = new Map<string, DailyEntry>();
    for (const entry of entries) map.set(entry.date, entry);
    return map;
  }, [entries]);

  const intakeByDate = useMemo<Map<string, DailyIntake>>(
    () => dailyIntake(intake),
    [intake],
  );

  const isOn = useMemo(() => {
    return (habit: Habit, dateKey: string): boolean => {
      if (habit.source === "daily") {
        return byDate.get(dateKey)?.[habit.key] === true;
      }
      return intakeByDate.get(dateKey)?.[habit.key] === true;
    };
  }, [byDate, intakeByDate]);

  const figures = useMemo(() => {
    const logged = entries.length;
    const map = new Map<string, string>();
    const intakeDays = Array.from(intakeByDate.values());
    for (const habit of ALL_HABITS) {
      if (habit.source === "daily") {
        const on = entries.filter(
          (entry) => entry[habit.key] === true,
        ).length;
        map.set(
          habit.key,
          logged ? `${Math.round((on / logged) * 100)}% consistency` : "—",
        );
      } else {
        const on = intakeDays.filter((day) => day[habit.key]).length;
        map.set(habit.key, `${on} ${on === 1 ? "day" : "days"} logged`);
      }
    }
    return map;
  }, [entries, intakeByDate]);

  const days = useMemo(() => {
    const today = dayjs(todayKey());
    const start = today.endOf("week").subtract(WEEKS * 7 - 1, "day");
    return Array.from({ length: WEEKS * 7 }, (_, index) => {
      const day = start.add(index, "day");
      return {
        key: day.format("YYYY-MM-DD"),
        future: day.isAfter(today, "day"),
      };
    });
  }, []);

  return (
    <div>
      <Typography.Title level={5}>
        <Icon name="habits" />
        Habits
      </Typography.Title>

      {!loaded ? (
        <Flex justify="center" style={{ padding: 24 }}>
          <Spin />
        </Flex>
      ) : (
        <div style={{ overflowX: "auto", paddingBottom: 4 }}>
          <Flex
            vertical
            gap={24}
            style={{ width: WEEKS * (CELL + GAP) - GAP, minWidth: "100%" }}
            onMouseOver={(event) => {
              if (!hoverTips) return;
              const cell = (event.target as HTMLElement).closest<HTMLElement>(
                "[data-date]",
              );
              if (!cell?.dataset.date) return;
              const rect = cell.getBoundingClientRect();
              setTip({
                text: dayjs(cell.dataset.date).format("ddd, MMM D, YYYY"),
                x: rect.left + rect.width / 2,
                y: rect.top,
              });
            }}
            onMouseLeave={() => setTip(null)}
          >
            {HABIT_GROUPS.map((group) => (
              <div key={group.title}>
                <Typography.Text
                  style={{
                    display: "block",
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontSize: 11,
                    fontWeight: 600,
                    color: token.colorTextSecondary,
                  }}
                >
                  {group.title}
                </Typography.Text>
                <Flex vertical gap={14}>
                  {group.habits.map((habit) => (
                    <div key={habit.key}>
                      <Flex
                        align="center"
                        justify="space-between"
                        gap={8}
                        style={{ marginBottom: 4 }}
                      >
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                        >
                          {habit.label}
                        </Typography.Text>
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                        >
                          {figures.get(habit.key)}
                        </Typography.Text>
                      </Flex>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateRows: `repeat(7, ${CELL}px)`,
                          gridAutoFlow: "column",
                          gap: GAP,
                        }}
                      >
                        {days.map((day) => {
                          const on = !day.future && isOn(habit, day.key);
                          const background = day.future
                            ? "transparent"
                            : on
                              ? habit.tone === "bad"
                                ? badColor
                                : token.colorSuccess
                              : token.colorFillSecondary;
                          return (
                            <div
                              key={day.key}
                              data-date={day.future ? undefined : day.key}
                              style={{
                                width: CELL,
                                height: CELL,
                                borderRadius: 2,
                                background,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </Flex>
              </div>
            ))}
          </Flex>
        </div>
      )}

      {tip ? (
        <div
          style={{
            position: "fixed",
            left: tip.x,
            top: tip.y - 8,
            transform: "translate(-50%, -100%)",
            padding: "4px 8px",
            fontSize: 12,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            borderRadius: token.borderRadiusSM,
            background: token.colorBgSpotlight,
            color: token.colorTextLightSolid,
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          {tip.text}
        </div>
      ) : null}
    </div>
  );
}
