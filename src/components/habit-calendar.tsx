"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Card, Flex, Grid, Spin, theme, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { Icon } from "@/components/icon";
import { useHealthData } from "@/components/health-data-provider";
import { useHealthHistory } from "@/components/use-health-history";
import { mergeById, mergeByDate } from "@/lib/merge-records";
import { isOutsideEatingWindow } from "@/lib/eating-window";
import { Tip } from "@/components/tip";
import {
  TERRACOTTA,
  TERRACOTTA_DARK,
  useIsDark,
} from "@/components/theme-provider";
import { type HabitEntry } from "@/models/habits";
import { dailyIntake, type DailyIntake } from "@/models/intake";

const WEEKS = 26;
const WEEKS_SM = 13;
const CELL = 11;
const GAP = 3;

type GoodHabit = "bath" | "brushTeeth" | "steps";
type IntakeHabit = "junkFood" | "junkDrink";

type Habit =
  | { key: GoodHabit; label: ReactNode; tone: "good"; source: "habit" }
  | { key: IntakeHabit; label: ReactNode; tone: "bad"; source: "intake" }
  | {
      key: "ateOutsideWindow";
      label: ReactNode;
      tone: "bad";
      source: "window";
    };

const HABIT_GROUPS: { title: string; habits: Habit[] }[] = [
  {
    title: "Good habits",
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
        source: "habit",
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
        source: "habit",
      },
      {
        key: "steps",
        label: (
          <>
            <Icon name="steps" />
            10k steps
          </>
        ),
        tone: "good",
        source: "habit",
      },
    ],
  },
  {
    title: "Bad habits",
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
      {
        key: "ateOutsideWindow",
        label: (
          <>
            <Icon name="clock" />
            Off-window eating
          </>
        ),
        tone: "bad",
        source: "window",
      },
    ],
  },
];

const ALL_HABITS: Habit[] = HABIT_GROUPS.flatMap((group) => group.habits);

export function HabitCalendar({ throughDate }: { throughDate: Dayjs }) {
  const { token } = theme.useToken();
  const isDark = useIsDark();
  const badColor = isDark ? TERRACOTTA_DARK : TERRACOTTA;
  const screens = Grid.useBreakpoint();
  const hoverTips = screens.md === true;
  const weeks = screens.md === false ? WEEKS_SM : WEEKS;

  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );

  const {
    habits,
    intake: intakeWindow,
    ideals,
    cutoff,
    ready,
  } = useHealthData();
  const eatWindow = ideals.eatingWindow;
  const hasWindow = !!(eatWindow.start && eatWindow.end);
  const windowStart = throughDate
    .startOf("day")
    .subtract(weeks * 7 - 1, "day")
    .format("YYYY-MM-DD");
  const needHistory = windowStart < cutoff;
  const history = useHealthHistory(needHistory, cutoff);
  const loaded = ready && (!needHistory || history.ready);

  const entries = useMemo(
    () => mergeByDate(habits, history.habits),
    [habits, history.habits],
  );
  const intake = useMemo(
    () => mergeById(intakeWindow, history.intake),
    [intakeWindow, history.intake],
  );

  const last7 = useMemo(
    () =>
      new Set(
        Array.from({ length: 7 }, (_, index) =>
          throughDate
            .startOf("day")
            .subtract(index, "day")
            .format("YYYY-MM-DD"),
        ),
      ),
    [throughDate],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, HabitEntry>();
    for (const entry of entries) map.set(entry.date, entry);
    return map;
  }, [entries]);

  const intakeByDate = useMemo<Map<string, DailyIntake>>(
    () => dailyIntake(intake),
    [intake],
  );

  const outsideWindowByDate = useMemo(() => {
    const set = new Set<string>();
    if (!hasWindow) return set;
    for (const entry of intake) {
      if (isOutsideEatingWindow(entry.time, eatWindow)) set.add(entry.date);
    }
    return set;
  }, [intake, hasWindow, eatWindow]);

  const isOn = useMemo(() => {
    return (habit: Habit, dateKey: string): boolean => {
      if (habit.source === "habit") {
        return byDate.get(dateKey)?.[habit.key] === true;
      }
      if (habit.source === "window") {
        return outsideWindowByDate.has(dateKey);
      }
      return intakeByDate.get(dateKey)?.[habit.key] === true;
    };
  }, [byDate, intakeByDate, outsideWindowByDate]);

  const days = useMemo(() => {
    const end = throughDate.startOf("day");
    const start = end.subtract(weeks * 7 - 1, "day");
    return Array.from({ length: weeks * 7 }, (_, index) => ({
      key: start.add(index, "day").format("YYYY-MM-DD"),
    }));
  }, [throughDate, weeks]);

  const visibleDates = useMemo(
    () => new Set(days.map((day) => day.key)),
    [days],
  );

  const figures = useMemo(() => {
    const map = new Map<string, string>();
    const intakeDays = Array.from(intakeByDate.values()).filter((day) =>
      visibleDates.has(day.date),
    );
    for (const habit of ALL_HABITS) {
      if (habit.source === "habit") {
        let on = 0;
        for (const date of last7) {
          if (byDate.get(date)?.[habit.key] === true) on += 1;
        }
        map.set(habit.key, `${Math.round((on / 7) * 100)}% consistency`);
      } else if (habit.source === "window") {
        let on = 0;
        for (const date of outsideWindowByDate) {
          if (visibleDates.has(date)) on += 1;
        }
        map.set(habit.key, `${on} ${on === 1 ? "day" : "days"} logged`);
      } else {
        const on = intakeDays.filter((day) => day[habit.key]).length;
        map.set(habit.key, `${on} ${on === 1 ? "day" : "days"} logged`);
      }
    }
    return map;
  }, [byDate, last7, intakeByDate, outsideWindowByDate, visibleDates]);

  return (
    <div>
      {!loaded ? (
        <Card
          styles={{ body: { padding: 28 } }}
          style={{
            borderColor: token.colorBorderSecondary,
            borderRadius: token.borderRadiusLG,
            boxShadow: token.boxShadowTertiary,
          }}
        >
          <Typography.Title level={5}>
            <Icon name="habits" />
            Habits
          </Typography.Title>
          <Flex justify="center" style={{ padding: 24 }}>
            <Spin />
          </Flex>
        </Card>
      ) : (
        <Flex vertical gap={24}>
          {HABIT_GROUPS.map((group) => {
            const habits = group.habits.filter(
              (habit) => habit.source !== "window" || hasWindow,
            );
            if (habits.length === 0) return null;
            return (
            <Card
              key={group.title}
              styles={{ body: { padding: 28 } }}
              style={{
                borderColor: token.colorBorderSecondary,
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
              }}
            >
              <Typography.Title level={5}>
                <Icon name="habits" />
                {group.title}
              </Typography.Title>
              <div style={{ overflowX: "auto", paddingBottom: 4 }}>
                <Flex
                  vertical
                  style={{
                    width: weeks * (CELL + GAP) - GAP,
                    minWidth: "100%",
                  }}
                  onMouseOver={(event) => {
                    if (!hoverTips) return;
                    const cell = (
                      event.target as HTMLElement
                    ).closest<HTMLElement>("[data-date]");
                    if (!cell?.dataset.date) return;
                    const rect = cell.getBoundingClientRect();
                    setTip({
                      text: dayjs(cell.dataset.date).format(
                        "ddd, MMM D, YYYY",
                      ),
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setTip(null)}
                >
                  <Flex vertical gap={14}>
                    {habits.map((habit) => (
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
                          <Tip
                            placement="left"
                            title={
                              habit.source === "habit"
                                ? "How many of the last 7 days you did this, out of 7."
                                : habit.source === "window"
                                  ? `Days with any eating outside your window, over the ${weeks} weeks shown.`
                                  : `Days with junk logged, over the ${weeks} weeks shown.`
                            }
                          >
                            <Typography.Text
                              type="secondary"
                              style={{ fontSize: 12, cursor: "help" }}
                            >
                              {figures.get(habit.key)}
                            </Typography.Text>
                          </Tip>
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
                            const on = isOn(habit, day.key);
                            const background = on
                              ? habit.tone === "bad"
                                ? badColor
                                : token.colorSuccess
                              : token.colorFillSecondary;
                            return (
                              <div
                                key={day.key}
                                data-date={day.key}
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
                </Flex>
              </div>
            </Card>
            );
          })}
        </Flex>
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
