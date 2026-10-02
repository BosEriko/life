"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button, Card, DatePicker, Flex, Segmented, Spin, theme } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { AverageStats } from "@/components/average-stats";
import { useAuth } from "@/components/auth-provider";
import { CreditAlert } from "@/components/credit-alert";
import { useHealthData } from "@/components/health-data-provider";
import { IdealsModal } from "@/components/ideals-modal";
import { PageHeading } from "@/components/page-heading";
import { HabitCalendar } from "@/components/habit-calendar";
import { LandingPage } from "@/components/landing-page";
import { RecentEntries } from "@/components/recent-entries";
import { TaskReminders } from "@/components/task-reminders";
import { todayKey } from "@/models/dailies";
import { Icon } from "@/components/icon";

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
  const { ideals } = useHealthData();
  const [idealsOpen, setIdealsOpen] = useState(false);
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

  const [custom, setCustom] = useState(false);
  const trendValue = custom || !presetValue ? "custom" : presetValue;

  function applyPreset(value: string) {
    setCustom(value === "custom");
    if (value === "custom") return;
    if (value === "all") setRange([null, today]);
    else setRange([today.subtract(Number(value) - 1, "day"), today]);
  }

  return (
    <>
      <CreditAlert />

      <PageHeading
        title="Health"
        subtitle="A calm view of your recent days."
        extra={
          <Button type="primary" icon={<Icon name="target" style={{ marginRight: 0, opacity: 1, color: "inherit" }} />} onClick={() => setIdealsOpen(true)}>
            Set ideal ranges
          </Button>
        }
        marginBottom={18}
      />

      <div style={{ marginBottom: 24 }}>
        <AverageStats />
      </div>

      <Flex align="center" justify="center" gap={10} wrap style={{ marginBottom: 18 }}>
        <Flex gap={8}>
          <Segmented
            options={TREND_RANGE_OPTIONS}
            value={trendValue === "custom" ? "" : trendValue}
            onChange={(value) => applyPreset(value as string)}
          />
          <Segmented
            options={[{ label: "Custom", value: "custom" }]}
            value={trendValue === "custom" ? "custom" : ""}
            onChange={(value) => applyPreset(value as string)}
          />
        </Flex>
        {trendValue === "custom" && <DatePicker.RangePicker
          aria-label="Trend date range"
          value={[start, end]}
          onChange={(values) => {
            if (!values) return;
            setRange([values[0], values[1] ?? today]);
          }}
          format="MMM D, YYYY"
          allowClear={false}
          allowEmpty={[true, false]}
          inputReadOnly
          maxDate={today}
          style={{ width: 270 }}
        />}
      </Flex>

      <div className="home-grid">
        <Flex vertical gap={24} style={{ minWidth: 0 }}>
          <Card
            styles={{ body: { padding: 20 } }}
            style={{
              borderColor: token.colorBorderSecondary,
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowTertiary,
            }}
          >
            <MetricsChart start={start} end={end} />
          </Card>
          <HabitCalendar throughDate={end} />
        </Flex>
        <Flex vertical gap={24} style={{ minWidth: 0 }}>
          <TaskReminders />
          <Card
            styles={{ body: { padding: 20 } }}
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

      <IdealsModal
        open={idealsOpen}
        onClose={() => setIdealsOpen(false)}
        ideals={ideals}
      />
    </>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  return user ? <HealthDashboard /> : <LandingPage />;
}
