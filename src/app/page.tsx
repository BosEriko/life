"use client";

import dynamic from "next/dynamic";
import { Flex, Spin } from "antd";
import { AverageStats } from "@/components/average-stats";
import { DailyTracker } from "@/components/daily-tracker";
import { DashboardHeader } from "@/components/dashboard-header";
import { HabitCalendar } from "@/components/habit-calendar";
import { RecentEntries } from "@/components/recent-entries";
import { ReportDownload } from "@/components/report-download";
import { SaveStatusProvider } from "@/components/save-status";

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

export default function Home() {
  return (
    <SaveStatusProvider>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 20px" }}>
        <DashboardHeader />

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
          <DailyTracker />
          <HabitCalendar />
          <Flex vertical gap={40}>
            <MetricsChart />
            <RecentEntries />
          </Flex>
        </div>

        <ReportDownload />
      </div>
    </SaveStatusProvider>
  );
}
