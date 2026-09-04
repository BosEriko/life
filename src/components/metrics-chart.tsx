"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  DatePicker,
  Empty,
  Flex,
  Segmented,
  Spin,
  theme,
  Typography,
} from "antd";
import { Line } from "@ant-design/charts";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import {
  TERRACOTTA,
  TERRACOTTA_DARK,
  useIsDark,
} from "@/components/theme-provider";
import { todayKey, watchDailies, type DailyEntry } from "@/models/dailies";

const HISTORY_LIMIT = 1000;

type Metric = "weight" | "bp" | "water";
type Preset = "7" | "30" | "90" | "365" | "all" | "custom";

const METRIC_OPTIONS = [
  { label: "Weight", value: "weight" },
  { label: "Blood pressure", value: "bp" },
  { label: "Water", value: "water" },
];

const PRESET_OPTIONS = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "1Y", value: "365" },
  { label: "All", value: "all" },
  { label: "Custom", value: "custom" },
];

type Point = { date: string; value: number; series: string };

const METRIC_STORAGE_KEY = "trends-metric";

function loadMetric(): Metric {
  try {
    const saved = window.localStorage.getItem(METRIC_STORAGE_KEY);
    if (saved === "weight" || saved === "bp" || saved === "water") {
      return saved;
    }
  } catch {
    // localStorage unavailable
  }
  return "weight";
}

function saveMetric(metric: Metric) {
  try {
    window.localStorage.setItem(METRIC_STORAGE_KEY, metric);
  } catch {
    // localStorage unavailable
  }
}

export function MetricsChart() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const isDark = useIsDark();

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [metric, setMetric] = useState<Metric>(loadMetric);
  const [preset, setPreset] = useState<Preset>("30");
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);

  useEffect(() => {
    if (!user) return;
    return watchDailies(
      user.uid,
      (next) => {
        setEntries(next);
        setLoaded(true);
      },
      () => {
        message.error("Could not load your history.");
        setLoaded(true);
      },
      HISTORY_LIMIT,
    );
  }, [user, message]);

  const [start, end] = useMemo<[Dayjs | null, Dayjs]>(() => {
    const today = dayjs(todayKey());
    if (preset === "custom") {
      return customRange
        ? [customRange[0].startOf("day"), customRange[1].startOf("day")]
        : [null, today];
    }
    if (preset === "all") return [null, today];
    return [today.subtract(Number(preset) - 1, "day"), today];
  }, [preset, customRange]);

  const data = useMemo<Point[]>(() => {
    const ascending = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const points: Point[] = [];

    for (const entry of ascending) {
      const day = dayjs(entry.date);
      if (start && day.isBefore(start, "day")) continue;
      if (day.isAfter(end, "day")) continue;

      if (metric === "weight") {
        if (entry.weight != null) {
          points.push({ date: entry.date, value: entry.weight, series: "Weight" });
        }
      } else if (metric === "water") {
        if (entry.water != null) {
          points.push({ date: entry.date, value: entry.water, series: "Water" });
        }
      } else {
        if (entry.systolic != null) {
          points.push({
            date: entry.date,
            value: entry.systolic,
            series: "Systolic",
          });
        }
        if (entry.diastolic != null) {
          points.push({
            date: entry.date,
            value: entry.diastolic,
            series: "Diastolic",
          });
        }
      }
    }

    return points;
  }, [entries, metric, start, end]);

  const terracotta = isDark ? TERRACOTTA_DARK : TERRACOTTA;
  const colorRange =
    metric === "weight"
      ? [token.colorPrimary]
      : metric === "water"
        ? [token.colorPrimary]
        : [terracotta, token.colorPrimary];

  return (
    <div>
      <Flex
        align="center"
        justify="space-between"
        gap={12}
        wrap
        style={{ marginBottom: 12 }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          <Icon name="trends" />Trends
        </Typography.Title>
        <Segmented
          options={METRIC_OPTIONS}
          value={metric}
          onChange={(value) => {
            const next = value as Metric;
            setMetric(next);
            saveMetric(next);
          }}
        />
      </Flex>

      <Flex align="center" gap={12} wrap style={{ marginBottom: 16 }}>
        <Segmented
          options={PRESET_OPTIONS}
          value={preset}
          onChange={(value) => {
            const next = value as Preset;
            setPreset(next);
            if (next === "custom") {
              if (!customRange) {
                const today = dayjs(todayKey());
                setCustomRange([today.subtract(29, "day"), today]);
              }
            } else {
              setCustomRange(null);
            }
          }}
        />
        <DatePicker.RangePicker
          value={customRange}
          maxDate={dayjs(todayKey())}
          onChange={(range) => {
            if (range && range[0] && range[1]) {
              setCustomRange([range[0], range[1]]);
              setPreset("custom");
            } else {
              setCustomRange(null);
              setPreset("30");
            }
          }}
        />
      </Flex>

      {!loaded ? (
        <Flex justify="center" style={{ padding: 48 }}>
          <Spin />
        </Flex>
      ) : data.length === 0 ? (
        <Empty
          description={
            metric === "weight"
              ? "No weight entries in this range."
              : metric === "water"
                ? "No water entries in this range."
                : "No blood pressure entries in this range."
          }
        />
      ) : (
        <Line
          data={data}
          xField="date"
          yField="value"
          colorField="series"
          autoFit
          height={280}
          theme={isDark ? "classicDark" : "classic"}
          legend={metric === "bp" ? { color: { position: "top" } } : false}
          scale={{ color: { range: colorRange } }}
          axis={{
            x: {
              tickCount: 6,
              labelFormatter: (value: string) => dayjs(value).format("MMM D"),
            },
            y: { title: null },
          }}
          style={{ lineWidth: 2 }}
        />
      )}
    </div>
  );
}
