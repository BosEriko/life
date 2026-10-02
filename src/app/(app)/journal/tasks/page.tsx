"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Grid, Typography, theme } from "antd";
import { CalendarOutlined, ClockCircleOutlined, ScheduleOutlined, SyncOutlined } from "@ant-design/icons";
import { PageHeading } from "@/components/page-heading";
import { AddTaskModal, TasksList, type TaskView } from "@/components/tasks-card";
import { journalViewUrl, taskViewFromQuery } from "@/lib/journal-views";
import { JournalSkeleton } from "@/components/journal-skeleton";
import { SideMenu } from "@/components/side-menu";

const VIEWS = [
  { value: "today" as const, label: "Today", Icon: CalendarOutlined },
  { value: "daily" as const, label: "Daily", Icon: ClockCircleOutlined },
  { value: "weekly" as const, label: "Weekly", Icon: SyncOutlined },
  { value: "monthly" as const, label: "Monthly", Icon: ScheduleOutlined },
  { value: "yearly" as const, label: "Yearly", Icon: CalendarOutlined },
];

export default function TasksPage() {
  return <Suspense fallback={<JournalSkeleton />}><TasksContent /></Suspense>;
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
          <Button type="primary" icon={<ScheduleOutlined />} onClick={() => setAddOpen(true)}>
            Add task
          </Button>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: screens.lg === true ? "230px minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
        <SideMenu
          ariaLabel="Task views"
          items={VIEWS.map(({ value, label, Icon }) => ({ key: value, icon: <Icon />, label }))}
          selectedKey={view}
          onSelect={(key) => setView(key as TaskView)}
        />
        <Card styles={{ body: { padding: 20 } }} style={{ minWidth: 0, boxShadow: token.boxShadowTertiary }}>
          <Typography.Title level={4} style={{ margin: "0 0 16px" }}>{VIEWS.find((item) => item.value === view)?.label}</Typography.Title>
          <TasksList view={view} />
        </Card>
      </div>
      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
