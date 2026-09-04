"use client";

import dynamic from "next/dynamic";
import { Button, Flex, Spin, Typography } from "antd";
import { useAuth } from "@/components/auth-provider";
import { DailyTracker } from "@/components/daily-tracker";
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

export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 20px" }}>
      <Flex
        align="center"
        justify="space-between"
        gap={16}
        style={{ marginBottom: 32 }}
      >
        <div style={{ minWidth: 0 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Bos Eriko&apos;s Personal Life Tracker
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {user?.email}
          </Typography.Text>
        </div>
        <Button onClick={() => signOut()}>Sign out</Button>
      </Flex>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 40,
          alignItems: "start",
        }}
      >
        <DailyTracker />
        <Flex vertical gap={40}>
          <HabitCalendar />
          <MetricsChart />
          <RecentEntries />
        </Flex>
      </div>
    </div>
  );
}
