"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button, Card, DatePicker, Flex, Segmented, Spin, theme } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { AverageStats } from "@/components/average-stats";
import { useAuth } from "@/components/auth-provider";
import { CreditAlert } from "@/components/credit-alert";
import { HabitCalendar } from "@/components/habit-calendar";
import { Icon } from "@/components/icon";
import { LandingPage } from "@/components/landing-page";
import { RecentEntries } from "@/components/recent-entries";
import { todayKey } from "@/models/dailies";

const TREND_RANGE_OPTIONS = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "1Y", value: "365" },
  { label: "All", value: "all" },
];

const PRESET_DAYS = ["7", "30", "90", "365"] as const;

type DateRange = [Dayjs | null, Dayjs];

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

function HealthDashboard() {
  const { token } = theme.useToken();
  const today = dayjs(todayKey());
  const [range, setRange] = useState<DateRange>(() => {
    const now = dayjs(todayKey());
    return [now.subtract(29, "day"), now];
  });
  const [start, end] = range;

  const endIsToday = end.isSame(today, "day");
  const presetValue = endIsToday
    ? start == null
      ? "all"
      : PRESET_DAYS.find((n) => today.diff(start, "day") + 1 === Number(n))
    : undefined;

  function nudgeStart(delta: number) {
    setRange(([current, currentEnd]) => {
      const next = (current ?? currentEnd).add(delta, "day");
      return [next.isAfter(currentEnd, "day") ? currentEnd : next, currentEnd];
    });
  }

  function applyPreset(value: string) {
    if (value === "all") setRange([null, today]);
    else setRange([today.subtract(Number(value) - 1, "day"), today]);
  }

  return (
    <>
      <CreditAlert />

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
          aria-label="Move start date earlier"
          icon={<LeftOutlined />}
          onClick={() => nudgeStart(-1)}
        />
        <DatePicker.RangePicker
          value={[start, end]}
          onChange={(values) => {
            if (!values) return;
            setRange([values[0], values[1] ?? today]);
          }}
          format="YYYY-MM-DD"
          allowClear={false}
          allowEmpty={[true, false]}
          inputReadOnly
          maxDate={today}
          style={{ minWidth: 260 }}
        />
        <Button
          aria-label="Move start date later"
          icon={<RightOutlined />}
          disabled={start != null && !start.isBefore(end, "day")}
          onClick={() => nudgeStart(1)}
        />
        <Button
          icon={<Icon name="date" style={{ marginRight: 0, opacity: 1 }} />}
          disabled={start != null && start.isSame(today, "day") && endIsToday}
          onClick={() => setRange([today, today])}
        >
          Today
        </Button>
        <Segmented
          options={TREND_RANGE_OPTIONS}
          value={presetValue}
          onChange={(value) => applyPreset(value as string)}
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
        <HabitCalendar throughDate={end} />
        <Flex vertical gap={24} style={{ minWidth: 0 }}>
          <Card
            styles={{ body: { padding: 28 } }}
            style={{
              borderColor: token.colorBorderSecondary,
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowTertiary,
            }}
          >
            <MetricsChart start={start} end={end} />
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

export default function HomePage() {
  const { user } = useAuth();
  return user ? <HealthDashboard /> : <LandingPage />;
}
