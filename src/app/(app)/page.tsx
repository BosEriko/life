"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button, Card, DatePicker, Flex, Segmented, Spin, theme } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AverageStats } from "@/components/average-stats";
import { HabitCalendar } from "@/components/habit-calendar";
import { Icon } from "@/components/icon";
import { RecentEntries } from "@/components/recent-entries";
import { todayKey } from "@/models/dailies";
import type { TrendsPreset } from "@/components/metrics-chart";

const TREND_RANGE_OPTIONS = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "1Y", value: "365" },
  { label: "All", value: "all" },
];

const MetricsChart = dynamic(
  () => import("@/components/metrics-chart").then((mod) => mod.MetricsChart),
  {
    ssr: false,
    loading: () => (
      <Flex justify="center" style={{ padding: 48 }}>
        <Spin />
      </Flex>
    ),
  },
);

export default function HealthPage() {
  const { token } = theme.useToken();
  const [throughDate, setThroughDate] = useState(() => dayjs(todayKey()));
  const [trendRange, setTrendRange] = useState<TrendsPreset>("30");
  const today = dayjs(todayKey());

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <AverageStats />
      </div>

      <Flex
        align="center"
        justify="center"
        gap={8}
        wrap
        style={{ marginBottom: 48 }}
      >
        <Button
          aria-label="Previous day"
          icon={<LeftOutlined />}
          onClick={() =>
            setThroughDate((current) => current.subtract(1, "day"))
          }
        />
        <DatePicker
          value={throughDate}
          onChange={(value) => value && setThroughDate(value)}
          format="YYYY-MM-DD"
          allowClear={false}
          inputReadOnly
          maxDate={today}
          style={{ minWidth: 160 }}
        />
        <Button
          aria-label="Next day"
          icon={<RightOutlined />}
          disabled={throughDate.isSame(today, "day")}
          onClick={() => setThroughDate((current) => current.add(1, "day"))}
        />
        <Button
          icon={<Icon name="date" style={{ marginRight: 0, opacity: 1 }} />}
          disabled={throughDate.isSame(today, "day")}
          onClick={() => setThroughDate(today)}
        >
          Today
        </Button>
        <Segmented
          options={TREND_RANGE_OPTIONS}
          value={trendRange}
          onChange={(value) => setTrendRange(value as TrendsPreset)}
        />
      </Flex>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
          gap: 24,
          alignItems: "start",
          paddingBottom: 32,
        }}
      >
        <HabitCalendar throughDate={throughDate} />
        <Flex vertical gap={24} style={{ minWidth: 0 }}>
          <Card
            styles={{ body: { padding: 28 } }}
            style={{
              borderColor: token.colorBorderSecondary,
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowTertiary,
            }}
          >
            <MetricsChart throughDate={throughDate} preset={trendRange} />
          </Card>
          <Card
            styles={{ body: { padding: 28 } }}
            style={{
              borderColor: token.colorBorderSecondary,
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowTertiary,
            }}
          >
            <RecentEntries />
          </Card>
        </Flex>
      </div>
    </>
  );
}
