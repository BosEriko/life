"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { App, Checkbox, Flex, Typography, theme } from "antd";
import { ArrowRightOutlined, BellOutlined, InfoCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { RichText, plainText } from "@/components/rich-text";
import { allTaskSubtasksDone, formatTaskTime, overdueTasks, taskSubtaskChecks } from "@/lib/task-schedule";
import { setTaskChecked } from "@/models/users/tasks";
import { TaskSubtasks } from "@/components/task-subtasks";
import { Tip } from "@/components/tip";
import { TaskDescription } from "@/components/task-description";

const HINT = "Today’s tasks whose time has arrived, plus any monthly or yearly tasks you haven’t finished yet.";

export function TaskReminders() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { tasks, taskChecks, tasksReady, taskChecksReady } = useHealthData();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(document.visibilityState === "visible" ? new Date() : null);
    const initial = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const date = now ? dayjs(now).format("YYYY-MM-DD") : "";
  const completed = taskChecks.find((row) => row.date === date)?.completed ?? {};
  const overdue = now && tasksReady && taskChecksReady ? overdueTasks(tasks, completed, now, taskChecks) : [];

  if (overdue.length === 0) return null;

  return (
    <aside
      aria-label="Upcoming task reminders"
      style={{
        overflow: "hidden",
        background: token.colorPrimaryBg,
        border: `1px solid ${token.colorPrimary}`,
        borderRadius: token.borderRadiusLG,
      }}
    >
      <Flex align="center" justify="space-between" gap={12} wrap style={{ padding: "16px 20px", background: token.colorPrimary, color: token.colorBgContainer }}>
        <Flex align="center" gap={10}>
          <BellOutlined aria-hidden style={{ fontSize: 24 }} />
          <div>
            <Typography.Text strong style={{ display: "block", fontSize: 16, color: "inherit" }}>Up next</Typography.Text>
            <Typography.Text style={{ fontSize: 12, color: "inherit" }}>{overdue.length} {overdue.length === 1 ? "task" : "tasks"} waiting</Typography.Text>
          </div>
          <Tip title={HINT} placement="left">
            <button type="button" className="task-reminders-help" aria-label={HINT} style={{ color: "inherit" }}><InfoCircleOutlined /></button>
          </Tip>
        </Flex>
        <Link href="/journal/tasks" style={{ fontSize: 13, color: "inherit" }}>All tasks <ArrowRightOutlined style={{ marginLeft: 4, fontSize: 11 }} /></Link>
      </Flex>
      <Flex vertical style={{ padding: "0 20px" }}>
        {overdue.map((task, index) => {
          const subtasks = taskSubtaskChecks(task, date, taskChecks);
          return (
            <Flex
              key={`${date}:${task.id}`}
              align="flex-start"
              gap={12}
              style={{
                padding: "16px 0",
                borderTop: index > 0 ? `1px solid color-mix(in srgb, ${token.colorPrimary} 14%, transparent)` : undefined,
              }}
            >
              <Checkbox
                aria-label={`Mark ${plainText(task.title)} as done`}
                checked={false}
                disabled={!allTaskSubtasksDone(task, subtasks)}
                onChange={() => {
                  if (user) setTaskChecked(user.uid, date, task.id, true, task, subtasks).catch(() => message.error("Could not update task."));
                }}
              />
              <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                <Flex align="baseline" justify="space-between" gap={8} wrap>
                  <Typography.Text strong style={{ flex: "1 1 140px", minWidth: 0 }}><RichText text={task.title} /></Typography.Text>
                  <Typography.Text style={{ fontSize: 12, whiteSpace: "nowrap", color: token.colorPrimaryText }}>{formatTaskTime(task.time)}</Typography.Text>
                </Flex>
                {task.description && (
                  <details className="task-reminders-details" style={{ color: token.colorTextSecondary }}>
                    <summary>Details</summary>
                    <div style={{ marginTop: 8 }}><TaskDescription task={task} /></div>
                  </details>
                )}
                <TaskSubtasks task={task} date={date} completed={subtasks} compact />
              </div>
            </Flex>
          );
        })}
      </Flex>
    </aside>
  );
}
