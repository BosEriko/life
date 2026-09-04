"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Flex, Spin, theme, Typography } from "antd";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { todayKey, watchDailies, type DailyEntry } from "@/lib/dailies";

const WEEKS = 26;
const CELL = 11;
const GAP = 3;
const HISTORY_LIMIT = 220;

type HabitField = "junkFood" | "junkDrink" | "bath" | "brushTeeth";

const HABITS: { label: string; field: HabitField; tone: "bad" | "good" }[] = [
  { label: "Junk food", field: "junkFood", tone: "bad" },
  { label: "Junk drink", field: "junkDrink", tone: "bad" },
  { label: "Bath", field: "bath", tone: "good" },
  { label: "Brush", field: "brushTeeth", tone: "good" },
];

export function HabitCalendar() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

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

  const byDate = useMemo(() => {
    const map = new Map<string, DailyEntry>();
    for (const entry of entries) map.set(entry.date, entry);
    return map;
  }, [entries]);

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

  const monthLabels = useMemo(() => {
    return Array.from({ length: WEEKS }, (_, week) => {
      const firstDay = dayjs(days[week * 7].key);
      const prevMonth =
        week === 0 ? -1 : dayjs(days[(week - 1) * 7].key).month();
      return firstDay.month() !== prevMonth ? firstDay.format("MMM") : "";
    });
  }, [days]);

  return (
    <div>
      <Typography.Title level={5}>Habits</Typography.Title>

      {!loaded ? (
        <Flex justify="center" style={{ padding: 24 }}>
          <Spin />
        </Flex>
      ) : (
        <div style={{ overflowX: "auto", paddingBottom: 4 }}>
          <Flex
            vertical
            gap={14}
            style={{ width: WEEKS * (CELL + GAP) - GAP, minWidth: "100%" }}
          >
            <Flex style={{ height: 12 }}>
              {monthLabels.map((label, week) => (
                <div
                  key={`m${week}`}
                  style={{
                    width: CELL,
                    marginRight: GAP,
                    fontSize: 10,
                    lineHeight: "12px",
                    color: token.colorTextTertiary,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </div>
              ))}
            </Flex>

            {HABITS.map((habit) => (
              <div key={habit.field}>
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 12, display: "block", marginBottom: 4 }}
                >
                  {habit.label}
                </Typography.Text>
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: `repeat(7, ${CELL}px)`,
                    gridAutoFlow: "column",
                    gap: GAP,
                  }}
                >
                  {days.map((day) => {
                    const on =
                      !day.future && byDate.get(day.key)?.[habit.field] === true;
                    const background = day.future
                      ? "transparent"
                      : on
                        ? habit.tone === "bad"
                          ? token.colorError
                          : token.colorSuccess
                        : token.colorFillSecondary;
                    return (
                      <div
                        key={day.key}
                        title={`${dayjs(day.key).format("MMM D, YYYY")} — ${
                          on ? "yes" : "no"
                        }`}
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
      )}
    </div>
  );
}
