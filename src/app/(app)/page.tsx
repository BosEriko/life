"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button, Card, DatePicker, Flex, Spin, theme, Typography } from "antd";
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

  function applyPreset(value: string) {
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
          <Button type="primary" onClick={() => setIdealsOpen(true)}>
            Set ideal ranges
          </Button>
        }
        marginBottom={18}
      />

      <div style={{ marginBottom: 16 }}>
        <AverageStats
          controls={
            <Flex align="center" gap={8} wrap>
              <Typography.Text type="secondary" strong style={{ fontSize: 12 }}>
                Trends
              </Typography.Text>
              <DatePicker.RangePicker
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
              />
              {TREND_RANGE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type={presetValue === option.value ? "primary" : "default"}
                  aria-pressed={presetValue === option.value}
                  onClick={() => applyPreset(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </Flex>
          }
        />
      </div>

      <div className="home-grid">
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
            <MetricsChart start={start} end={end} />
          </Card>
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
        <HabitCalendar throughDate={end} />
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
