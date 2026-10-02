"use client";

import { useEffect, useState } from "react";
import { App, Card, Checkbox, Flex, Typography, theme } from "antd";
import { AlignLeftOutlined, ClockCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
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
    <Card
      styles={{ body: { padding: 20 } }}
      style={{
        background: `color-mix(in srgb, ${token.colorWarning} 10%, ${token.colorBgContainer})`,
        borderColor: `color-mix(in srgb, ${token.colorWarning} 45%, ${token.colorBorderSecondary})`,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary,
      }}
    >
      <Flex align="center" justify="space-between" gap={8} style={{ marginBottom: 16 }}>
        <Typography.Text style={{ fontSize: 17 }}>
          <ClockCircleOutlined style={{ marginRight: 8, color: token.colorWarningText }} />
          Tasks
        </Typography.Text>
        <Tip title={HINT} placement="left">
          <InfoCircleOutlined aria-label={HINT} style={{ color: token.colorTextSecondary, cursor: "help" }} />
        </Tip>
      </Flex>
      <Flex vertical gap={10}>
        {overdue.map((task) => {
          const subtasks = taskSubtaskChecks(task, date, taskChecks);
          return (
            <Flex
              key={`${date}:${task.id}`}
              align="flex-start"
              gap={12}
              style={{
                padding: "14px 16px",
                borderRadius: token.borderRadius,
                background: `color-mix(in srgb, ${token.colorWarning} 28%, ${token.colorBgContainer})`,
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
              <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <Typography.Text strong><RichText text={task.title} /></Typography.Text>
                <Flex gap={8} align="center"><Typography.Text type="secondary"><ClockCircleOutlined /></Typography.Text><Typography.Text type="secondary">{formatTaskTime(task.time)}</Typography.Text></Flex>
                {task.description && <Flex gap={8} align="baseline"><Typography.Text type="secondary"><AlignLeftOutlined /></Typography.Text><div style={{ minWidth: 0, flex: 1 }}><TaskDescription task={task} /></div></Flex>}
                <TaskSubtasks task={task} date={date} completed={subtasks} />
              </div>
            </Flex>
          );
        })}
      </Flex>
    </Card>
  );
}
