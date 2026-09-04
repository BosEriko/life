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
            onMouseOver={(event) => {
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
