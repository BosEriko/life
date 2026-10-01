"use client";

import { useEffect, useState } from "react";
import { App, Button, Checkbox, Flex, Modal, Typography } from "antd";
import { AlignLeftOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { RichText, plainText } from "@/components/rich-text";
import { overdueTasks } from "@/lib/task-schedule";
import { setTaskChecked } from "@/models/tasks";

export function TaskReminders({ paused }: { paused: boolean }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { tasks, taskChecks, tasksReady, taskChecksReady } = useHealthData();
  const [now, setNow] = useState<Date | null>(null);
  const [snoozedUntil, setSnoozedUntil] = useState(0);

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
  const overdue = now && tasksReady && taskChecksReady ? overdueTasks(tasks, completed, now) : [];
  const open = !paused && !!now && now.getTime() >= snoozedUntil && overdue.length > 0;
  const snooze = () => setSnoozedUntil(Date.now() + 15 * 60_000);

  return (
    <Modal
      open={open}
      centered
      title={<><ClockCircleOutlined /> Tasks waiting for you</>}
      onCancel={snooze}
      footer={<Button onClick={snooze}>Remind me in 15 minutes</Button>}
      styles={{ body: { maxHeight: "60dvh", overflowY: "auto" } }}
    >
      <Typography.Paragraph type="secondary">Today’s unfinished tasks whose scheduled time has arrived. Check them off as you finish.</Typography.Paragraph>
      <Flex vertical gap={20}>
        {overdue.map((task) => (
          <Flex key={`${date}:${task.id}`} align="flex-start" gap={12}>
            <Checkbox
              aria-label={`Mark ${plainText(task.title)} as done`}
              checked={false}
              onChange={() => {
                if (user) setTaskChecked(user.uid, date, task.id, true).catch(() => message.error("Could not update task."));
              }}
            />
            <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              <Typography.Text strong><RichText text={task.title} /></Typography.Text>
              <Flex gap={6} align="center"><Typography.Text type="secondary"><ClockCircleOutlined /></Typography.Text><Typography.Text type="secondary">{task.time}</Typography.Text></Flex>
              {task.description && <Flex gap={6} align="baseline"><Typography.Text type="secondary"><AlignLeftOutlined /></Typography.Text><Typography.Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap", minWidth: 0 }}><RichText text={task.description} /></Typography.Paragraph></Flex>}
            </div>
          </Flex>
        ))}
      </Flex>
    </Modal>
  );
}
