"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
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
import { watchDailies, type DailyEntry } from "@/models/dailies";
import {
  dailyBpAverages,
  watchBpReadings,
  type BpReading,
} from "@/models/bp";
import {
  dailyWaterTotals,
  watchWaterLogs,
  type WaterLog,
} from "@/models/water";
import { useUnits } from "@/components/units-provider";
import { fromKg, fromMl } from "@/lib/units";

const HISTORY_LIMIT = 1000;

type Metric = "weight" | "bp" | "water";
export type TrendsPreset = "7" | "30" | "90" | "365" | "all";

const METRIC_OPTIONS = [
  { label: "Weight", value: "weight" },
  { label: "Blood pressure", value: "bp" },
  { label: "Water", value: "water" },
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

export function MetricsChart({
  throughDate,
  preset,
}: {
  throughDate: Dayjs;
  preset: TrendsPreset;
}) {
  const units = useUnits();
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const isDark = useIsDark();

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [bpReadings, setBpReadings] = useState<BpReading[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [metric, setMetric] = useState<Metric>(loadMetric);

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

  useEffect(() => {
    if (!user) return;
    return watchBpReadings(user.uid, setBpReadings, () => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchWaterLogs(user.uid, setWaterLogs, () => {});
  }, [user]);

  const [start, end] = useMemo<[Dayjs | null, Dayjs]>(() => {
    const endDate = throughDate.startOf("day");
    if (preset === "all") return [null, endDate];
    return [endDate.subtract(Number(preset) - 1, "day"), endDate];
  }, [preset, throughDate]);

  const data = useMemo<Point[]>(() => {
    const points: Point[] = [];

    if (metric === "bp") {
      const days = Array.from(dailyBpAverages(bpReadings).values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      for (const day of days) {
        const at = dayjs(day.date);
        if (start && at.isBefore(start, "day")) continue;
        if (at.isAfter(end, "day")) continue;
        points.push({ date: day.date, value: day.systolic, series: "Systolic" });
        points.push({
          date: day.date,
          value: day.diastolic,
          series: "Diastolic",
        });
      }
      return points;
    }

    if (metric === "water") {
      const days = Array.from(dailyWaterTotals(waterLogs).values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      for (const day of days) {
        const at = dayjs(day.date);
        if (start && at.isBefore(start, "day")) continue;
        if (at.isAfter(end, "day")) continue;
        points.push({
          date: day.date,
          value: fromMl(day.ml, units.volume),
          series: "Water",
        });
      }
      return points;
    }

    const ascending = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    for (const entry of ascending) {
      const day = dayjs(entry.date);
      if (start && day.isBefore(start, "day")) continue;
      if (day.isAfter(end, "day")) continue;
      if (entry.weight != null) {
        points.push({
          date: entry.date,
          value: fromKg(entry.weight, units.weight),
          series: "Weight",
        });
      }
    }

    return points;
  }, [entries, bpReadings, waterLogs, metric, start, end, units]);

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
