"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button, Drawer, Empty, Flex, Grid, Popover, Segmented, Typography, theme } from "antd";
import { ArrowRightOutlined, BellOutlined, CheckSquareOutlined, InfoCircleOutlined, ScheduleOutlined } from "@ant-design/icons";
import { Tip } from "@/components/tip";
import { TASK_REMINDER_HINT, TaskReminderList, TodayTodoList, useTodayAgenda } from "@/components/task-reminders";

type Tab = "tasks" | "todos";

export function NotificationBell() {
  const { token } = theme.useToken();
  const { date, now, tasks, dueNow, todos, attention } = useTodayAgenda();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("tasks");
  const screens = Grid.useBreakpoint();
  const sheet = screens.md === false;

  const content = (
    <div style={{ width: sheet ? "100%" : "min(380px, calc(100vw - 32px))" }}>
      <Flex align="center" justify="space-between" gap={12} style={{ marginBottom: 12 }}>
        <Flex align="center" gap={8}>
          <Typography.Text strong style={{ fontSize: sheet ? 17 : 15 }}>Today</Typography.Text>
          <Tip title={TASK_REMINDER_HINT} placement="bottom">
            <InfoCircleOutlined aria-label={TASK_REMINDER_HINT} style={{ color: token.colorTextSecondary, cursor: "help" }} />
          </Tip>
        </Flex>
        <Link href={tab === "tasks" ? "/journal/tasks" : "/journal/todo"} onClick={() => setOpen(false)} style={{ fontSize: 13 }}>
          {tab === "tasks" ? "All tasks" : "All to-dos"} <ArrowRightOutlined style={{ marginLeft: 4, fontSize: 11 }} />
        </Link>
      </Flex>
      <Segmented
        block
        aria-label="Notification type"
        value={tab}
        onChange={(value) => setTab(value as Tab)}
        options={[
          { value: "tasks", label: <span><ScheduleOutlined style={{ marginRight: 6 }} />Tasks{tasks.length ? ` (${tasks.length})` : ""}</span> },
          { value: "todos", label: <span><CheckSquareOutlined style={{ marginRight: 6 }} />To-dos{todos.length ? ` (${todos.length})` : ""}</span> },
        ]}
      />
      <div style={{ maxHeight: "min(60vh, 460px)", overflowY: "auto", marginTop: 4 }}>
        {tab === "tasks" ? (
          tasks.length ? <TaskReminderList date={date} overdue={tasks} dueNow={dueNow} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks left for today." style={{ margin: "20px 0 8px" }} />
        ) : todos.length ? (
          <TodayTodoList todos={todos} now={now} />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No to-dos due today." style={{ margin: "20px 0 8px" }} />
        )}
      </div>
    </div>
  );

  const bell = (
    <Button
      type="text"
      shape="circle"
      aria-label={attention ? `Notifications: ${attention} need attention` : "Notifications: nothing needs attention"}
      aria-haspopup="dialog"
      aria-expanded={open}
      data-tour="notifications"
      icon={
        <Badge count={attention} size="small" offset={[-3, 3]} overflowCount={99}>
          <BellOutlined style={{ fontSize: 20, color: attention ? token.colorPrimary : token.colorTextSecondary }} />
        </Badge>
      }
      onClick={sheet ? () => setOpen(true) : undefined}
    />
  );

  if (sheet) {
    return (
      <>
        {bell}
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          placement="bottom"
          title={null}
          closable={false}
          size="auto"
          styles={{ body: { padding: "16px 16px calc(16px + env(safe-area-inset-bottom))" }, wrapper: { maxHeight: "85dvh" } }}
          style={{ borderRadius: "16px 16px 0 0" }}
        >
          {content}
        </Drawer>
      </>
    );
  }

  return (
    <Popover trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen} content={content} arrow={false}>
      {bell}
    </Popover>
  );
}
