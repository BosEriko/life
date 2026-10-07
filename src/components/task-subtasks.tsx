"use client";

import { App, Checkbox, Flex, Typography } from "antd";
import { EnterOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import { RichText, plainText } from "@/components/rich-text";
import { setTaskSubtaskChecked } from "@/models/users/tasks";
import type { SubtaskChecks, Task } from "@/lib/task-schedule";

export function TaskSubtasks({ task, date, completed, disabled = false, readOnly = false, compact = false }: { task: Task; date: string; completed: SubtaskChecks; disabled?: boolean; readOnly?: boolean; compact?: boolean }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const subtasks = task.subtasks ?? [];
  if (!subtasks.length) return null;
  const count = subtasks.filter((subtask) => completed[subtask.id]).length;

  return <Flex vertical gap={8} style={{ marginTop: 12 }}>
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{readOnly ? `${subtasks.length} subtasks` : compact ? `${count}/${subtasks.length} steps${count < subtasks.length ? " · Finish steps to complete" : " · Ready to check off"}` : `${count} of ${subtasks.length} subtasks done${count < subtasks.length ? " · Complete all to unlock the task" : ""}`}</Typography.Text>
    {subtasks.map((subtask) => <Flex key={subtask.id} gap={8} align="flex-start">
      {!readOnly && <Checkbox aria-label={`Complete subtask ${plainText(subtask.title)} for ${plainText(task.title)}`} checked={!!completed[subtask.id]} disabled={disabled} onChange={(event) => {
        if (user) setTaskSubtaskChecked(user.uid, date, task, subtask.id, event.target.checked, completed).catch(() => message.error("Could not update subtask."));
      }} />}
      {readOnly && <Typography.Text type="secondary" aria-hidden><EnterOutlined style={{ fontSize: 12, transform: "scaleX(-1)" }} /></Typography.Text>}
      <Typography.Text delete={!readOnly && !!completed[subtask.id]} style={{ minWidth: 0, overflowWrap: "anywhere" }}><RichText text={subtask.title} /></Typography.Text>
    </Flex>)}
  </Flex>;
}
