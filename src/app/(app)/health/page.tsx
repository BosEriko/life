"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button, Card, Flex, Spin, theme } from "antd";
import { AverageStats } from "@/components/average-stats";
import { CreditAlert } from "@/components/credit-alert";
import { GettingStarted } from "@/components/getting-started";
import { useHealthData } from "@/components/health-data-provider";
import { IdealsModal } from "@/components/ideals-modal";
import { PageHeading } from "@/components/page-heading";
import { HabitCalendar } from "@/components/habit-calendar";
import { RecentEntries } from "@/components/recent-entries";
import { TaskReminders } from "@/components/task-reminders";
import { Icon } from "@/components/icon";
import { RangeFilter, useDateRange } from "@/components/range-filter";


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
  const { ideals } = useHealthData();
  const [idealsOpen, setIdealsOpen] = useState(false);
  const [range, setRange] = useDateRange();
  const [start, end] = range;

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

      <GettingStarted />

      <div style={{ marginBottom: 24 }}>
        <AverageStats />
      </div>

      <RangeFilter range={range} onChange={setRange} ariaLabel="Trend date range" style={{ marginBottom: 18 }} />

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
