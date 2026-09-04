"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { App, Flex, Spin, theme, Typography } from "antd";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import {
  TERRACOTTA,
  TERRACOTTA_DARK,
  useIsDark,
} from "@/components/theme-provider";
import { todayKey, watchDailies, type DailyEntry } from "@/models/dailies";

const WEEKS = 26;
const CELL = 11;
const GAP = 3;
const HISTORY_LIMIT = 220;

type HabitField = "junkFood" | "junkDrink" | "bath" | "brushTeeth";

const HABITS: { label: ReactNode; field: HabitField; tone: "bad" | "good" }[] = [
  {
    label: (
      <>
        <Icon name="junkFood" />
        Junk food
      </>
    ),
    field: "junkFood",
    tone: "bad",
  },
  {
    label: (
      <>
        <Icon name="junkDrink" />
        Junk drink
      </>
    ),
    field: "junkDrink",
    tone: "bad",
  },
  {
    label: (
      <>
        <Icon name="bath" />
        Bath
      </>
    ),
    field: "bath",
    tone: "good",
  },
  {
    label: (
      <>
        <Icon name="brush" />
        Brush
      </>
    ),
    field: "brushTeeth",
    tone: "good",
  },
];

export function HabitCalendar() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const isDark = useIsDark();
  const badColor = isDark ? TERRACOTTA_DARK : TERRACOTTA;

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

  const figures = useMemo(() => {
    const logged = entries.length;
    const map = new Map<HabitField, string>();
    for (const habit of HABITS) {
      const on = entries.filter((entry) => entry[habit.field] === true).length;
      if (habit.tone === "good") {
        map.set(
          habit.field,
          logged ? `${Math.round((on / logged) * 100)}% consistency` : "—",
        );
      } else {
        map.set(habit.field, `${on} ${on === 1 ? "day" : "days"} logged`);
      }
    }
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
                <Flex
                  align="center"
                  justify="space-between"
                  gap={8}
                  style={{ marginBottom: 4 }}
                >
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {habit.label}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {figures.get(habit.field)}
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
                    const on =
                      !day.future && byDate.get(day.key)?.[habit.field] === true;
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
