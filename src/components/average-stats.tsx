"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Flex, Segmented, Spin, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { todayKey, watchDailies, type DailyEntry } from "@/lib/dailies";

const HISTORY_LIMIT = 1000;
const RANGE_STORAGE_KEY = "averages-range";

const RANGE_VALUES = ["7", "30", "90", "365", "all"] as const;
type Range = (typeof RANGE_VALUES)[number];

const RANGE_OPTIONS = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "1Y", value: "365" },
  { label: "All", value: "all" },
];

const RANGE_CAPTION: Record<Range, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  "365": "Last 12 months",
  all: "All time",
};

function loadRange(): Range {
  try {
    const saved = window.localStorage.getItem(RANGE_STORAGE_KEY);
    if (saved && (RANGE_VALUES as readonly string[]).includes(saved)) {
      return saved as Range;
    }
  } catch {
    // localStorage unavailable
  }
  return "365";
}

function saveRange(range: Range) {
  try {
    window.localStorage.setItem(RANGE_STORAGE_KEY, range);
  } catch {
    // localStorage unavailable
  }
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function AverageStats() {
  const { user } = useAuth();
  const { message } = App.useApp();

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [range, setRange] = useState<Range>(loadRange);

  useEffect(() => {
    if (!user) return;
    return watchDailies(
      user.uid,
      (next) => {
        setEntries(next);
        setLoaded(true);
      },
      () => {
        message.error("Could not load your averages.");
        setLoaded(true);
      },
      HISTORY_LIMIT,
    );
  }, [user, message]);

  const stats = useMemo(() => {
    const inRange =
      range === "all"
        ? entries
        : entries.filter(
            (entry) =>
              !dayjs(entry.date).isBefore(
                dayjs(todayKey()).subtract(Number(range) - 1, "day"),
                "day",
              ),
          );

    const pick = (key: "weight" | "systolic" | "diastolic" | "water") =>
      mean(
        inRange
          .map((entry) => entry[key])
          .filter((value): value is number => value != null),
      );

    return {
      weight: pick("weight"),
      systolic: pick("systolic"),
      diastolic: pick("diastolic"),
      water: pick("water"),
    };
  }, [entries, range]);

  const items: { label: string; value: string; hint?: string }[] = [
    {
      label: "Weight",
      value: stats.weight != null ? `${stats.weight.toFixed(1)} kg` : "—",
    },
    {
      label: "Blood pressure",
      value:
        stats.systolic != null && stats.diastolic != null
          ? `${Math.round(stats.systolic)}/${Math.round(stats.diastolic)} mmHg`
          : "—",
      hint: "systolic/diastolic",
    },
    {
      label: "Water",
      value: stats.water != null ? `${Math.round(stats.water)} ml` : "—",
    },
  ];

  return (
    <div>
      <Flex
        align="center"
        justify="space-between"
        gap={12}
        wrap
        style={{ marginBottom: 4 }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          Averages
        </Typography.Title>
        <Segmented
          size="small"
          options={RANGE_OPTIONS}
          value={range}
          onChange={(value) => {
            const next = value as Range;
            setRange(next);
            saveRange(next);
          }}
        />
      </Flex>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {RANGE_CAPTION[range]}
      </Typography.Text>

      {!loaded ? (
        <Flex justify="center" style={{ padding: 24 }}>
          <Spin />
        </Flex>
      ) : (
        <Flex gap={28} wrap style={{ marginTop: 12 }}>
          {items.map((item) => (
            <div key={item.label}>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, display: "block", marginBottom: 2 }}
              >
                {item.label}
              </Typography.Text>
              <Tooltip title={item.hint} placement="bottom">
                <Typography.Text
                  strong
                  style={{
                    fontSize: 18,
                    cursor: item.hint ? "help" : undefined,
                  }}
                >
                  {item.value}
                </Typography.Text>
              </Tooltip>
            </div>
          ))}
        </Flex>
      )}
    </div>
  );
}
