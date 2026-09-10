"use client";

import { useMemo, useState } from "react";
import { Empty, Flex, Segmented, Spin, theme, Typography } from "antd";
import { Line } from "@ant-design/charts";
import dayjs, { type Dayjs } from "dayjs";
import { Icon } from "@/components/icon";
import { useHealthData } from "@/components/health-data-provider";
import { useHealthHistory } from "@/components/use-health-history";
import { mergeById, mergeByDate } from "@/lib/merge-records";
import {
  TERRACOTTA,
  TERRACOTTA_DARK,
  useIsDark,
} from "@/components/theme-provider";
import { dailyBpAverages } from "@/models/bp";
import { dailyWaterTotals } from "@/models/water";
import { useUnits } from "@/components/units-provider";
import { convertRange, fromKg, fromMl } from "@/lib/units";
import type { IdealRange } from "@/models/ideals";

type Metric = "weight" | "bp" | "water";

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
  start,
  end,
}: {
  start: Dayjs | null;
  end: Dayjs;
}) {
  const units = useUnits();
  const { token } = theme.useToken();
  const isDark = useIsDark();

  const [metric, setMetric] = useState<Metric>(loadMetric);

  const {
    dailies,
    bpReadings: bpWindow,
    waterLogs: waterWindow,
    ideals,
    cutoff,
    ready,
  } = useHealthData();
  const needHistory =
    start == null || start.format("YYYY-MM-DD") < cutoff;
  const history = useHealthHistory(needHistory, cutoff);
  const loaded = ready && (!needHistory || history.ready);

  const entries = useMemo(
    () => mergeByDate(dailies, history.dailies),
    [dailies, history.dailies],
  );
  const bpReadings = useMemo(
    () => mergeById(bpWindow, history.bpReadings),
    [bpWindow, history.bpReadings],
  );
  const waterLogs = useMemo(
    () => mergeById(waterWindow, history.waterLogs),
    [waterWindow, history.waterLogs],
  );

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

  const idealLines = useMemo<{ value: number; label: string }[]>(() => {
    const lines: { value: number; label: string }[] = [];
    const add = (range: IdealRange, prefix: string) => {
      if (range.min != null) {
        lines.push({ value: range.min, label: `${prefix}min ${range.min}` });
      }
      if (range.max != null) {
        lines.push({ value: range.max, label: `${prefix}max ${range.max}` });
      }
    };
    if (metric === "weight") {
      add(convertRange(ideals.weight, (v) => fromKg(v, units.weight)), "");
    } else if (metric === "water") {
      add(convertRange(ideals.water, (v) => fromMl(v, units.volume)), "");
    } else {
      add(ideals.systolic, "sys ");
      add(ideals.diastolic, "dia ");
    }
    return lines;
  }, [metric, ideals, units]);

  const yDomain = useMemo(() => {
    if (data.length === 0) return undefined;
    const values = [
      ...data.map((point) => point.value),
      ...idealLines.map((line) => line.value),
    ];
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = (hi - lo) * 0.08 || 1;
    return { domainMin: lo - pad, domainMax: hi + pad };
  }, [data, idealLines]);

  const annotations = useMemo(
    () =>
      idealLines.map((line) => ({
        type: "lineY" as const,
        data: [line.value],
        style: {
          stroke: token.colorTextSecondary,
          strokeOpacity: 0.4,
          lineWidth: 1,
          lineDash: [4, 4] as [number, number],
        },
        labels: [
          {
            text: line.label,
            position: "right" as const,
            textAlign: "end" as const,
            dx: -4,
            dy: -4,
            fill: token.colorTextSecondary,
            fillOpacity: 0.65,
            fontSize: 10,
          },
        ],
        tooltip: false,
      })),
    [idealLines, token],
  );

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
          scale={{ color: { range: colorRange }, y: yDomain }}
          annotations={annotations.length > 0 ? annotations : undefined}
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
