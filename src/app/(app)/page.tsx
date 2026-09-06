"use client";

import dynamic from "next/dynamic";
import { Flex, Spin } from "antd";
import { AverageStats } from "@/components/average-stats";
import { HabitCalendar } from "@/components/habit-calendar";
import { RecentEntries } from "@/components/recent-entries";

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
  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <AverageStats />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 32,
          alignItems: "start",
        }}
      >
        <HabitCalendar />
        <MetricsChart />
        <RecentEntries />
      </div>
    </>
  );
}
