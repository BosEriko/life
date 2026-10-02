"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Flex, Grid, Typography, theme } from "antd";
import { CalendarOutlined, ClockCircleOutlined, PlusOutlined, ScheduleOutlined, SyncOutlined } from "@ant-design/icons";
import { PageHeading } from "@/components/page-heading";
import { AddTaskModal, TasksList, type TaskView } from "@/components/tasks-card";
import { journalViewUrl, taskViewFromQuery } from "@/lib/journal-views";

const VIEWS = [
  { value: "today" as const, label: "Today", Icon: CalendarOutlined },
  { value: "daily" as const, label: "Daily", Icon: ClockCircleOutlined },
  { value: "weekly" as const, label: "Weekly", Icon: SyncOutlined },
  { value: "monthly" as const, label: "Monthly", Icon: ScheduleOutlined },
  { value: "yearly" as const, label: "Yearly", Icon: CalendarOutlined },
];

export default function TasksPage() {
  return <Suspense fallback={<p>Loading tasks…</p>}><TasksContent /></Suspense>;
}

function TasksContent() {
  const { token } = theme.useToken();
  const [addOpen, setAddOpen] = useState(false);
  const params = useSearchParams();
  const view = taskViewFromQuery(params.get("view"));
  const screens = Grid.useBreakpoint();

  function setView(next: TaskView) {
    if (params.get("view") === next) return;
    window.history.pushState(null, "", journalViewUrl(window.location.pathname, params.toString(), next, window.location.hash));
  }

  return (
    <div style={{ paddingRight: screens.md === true ? 56 : 0 }}>
      <PageHeading
        title="Tasks"
        subtitle="Build your routine, then check it off each day."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            Add task
          </Button>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: screens.lg === true ? "230px minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
        <Card styles={{ body: { padding: 16 } }} style={{ minWidth: 0, boxShadow: token.boxShadowTertiary }}>
          <nav aria-label="Task views"><Flex vertical gap={4}>
            {VIEWS.map(({ value, label, Icon }) => <Button key={value} type="text" icon={<Icon />} aria-pressed={view === value} onClick={() => setView(value)} style={{ width: "100%", height: 42, justifyContent: "flex-start", background: view === value ? token.colorPrimaryBg : undefined, color: view === value ? token.colorPrimary : undefined, fontWeight: view === value ? 700 : 400 }}>{label}</Button>)}
          </Flex></nav>
        </Card>
        <Card styles={{ body: { padding: 20 } }} style={{ minWidth: 0, boxShadow: token.boxShadowTertiary }}>
          <Typography.Title level={4} style={{ margin: "0 0 16px" }}>{VIEWS.find((item) => item.value === view)?.label}</Typography.Title>
          <TasksList view={view} />
        </Card>
      </div>
      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
