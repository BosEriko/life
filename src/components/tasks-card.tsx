"use client";

import { useState } from "react";
import { Alert, App, Button, Checkbox, DatePicker, Empty, Flex, Input, InputNumber, Segmented, Select, Spin, TimePicker, Typography, theme } from "antd";
import { ScheduleOutlined, EditOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useTaskDay } from "@/components/use-day-records";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { RichText, plainText } from "@/components/rich-text";
import { taskOccursOn, type Task } from "@/lib/task-schedule";
import { removeTask, saveTask, setTaskChecked } from "@/models/tasks";
import { todayKey } from "@/models/dailies";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const REPEATS = ["daily", "weekly", "monthly", "yearly"] as const;
const UNITS = { daily: "day(s)", weekly: "week(s)", monthly: "month(s)", yearly: "year(s)" };

function newTask(date: string): Task {
  const start = dayjs(date);
  return { id: "", title: "", description: "", time: "09:00", startDate: date, repeat: "daily", interval: 1, weekdays: [start.day()], monthlyMode: "date", monthDay: start.date(), ordinal: 1, weekday: start.day(), month: start.month() };
}

function TaskForm({ initial, onSaved, onCancel }: { initial: Task; onSaved: (task: Task) => void; onCancel: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [draft, setDraft] = useState(initial);
  const patch = (values: Partial<Task>) => setDraft((current) => ({ ...current, ...values }));
  const valid = draft.title.trim().length > 0 && draft.time && draft.startDate && Number.isInteger(draft.interval) && draft.interval >= 1 && (draft.repeat !== "weekly" || draft.weekdays.length > 0);

  function submit() {
    if (!user || !valid) return;
    const saved = { ...draft, id: draft.id || crypto.randomUUID(), title: draft.title.trim(), description: draft.description.trim() };
    saveTask(user.uid, saved).catch(() => message.error("Could not save task."));
    setDraft({ ...draft, title: "", description: "" });
    onSaved(saved);
    message.success(navigator.onLine ? "Task saved" : "Saved offline · will sync");
  }

  return (
    <Flex vertical gap={10} style={{ marginBottom: 20 }}>
        {initial.id && <Typography.Text strong>Edit task</Typography.Text>}
        <Flex gap={8} wrap>
          <DatePicker aria-label="Task start date" allowClear={false} inputReadOnly value={dayjs(draft.startDate)} onChange={(date) => date && patch({ startDate: date.format("YYYY-MM-DD") })} style={{ flex: 1, minWidth: 150 }} />
          <TimePicker aria-label="Task time" format="HH:mm" needConfirm={false} allowClear={false} value={dayjs(`${draft.startDate}T${draft.time}`)} onChange={(time) => time && patch({ time: time.format("HH:mm") })} style={{ width: 110 }} />
        </Flex>
        <Input aria-label="Task title" placeholder="Task title" prefix={<ScheduleOutlined style={{ opacity: 0.45 }} />} maxLength={120} value={draft.title} onChange={(event) => patch({ title: event.target.value })} autoFocus />
        <Input.TextArea aria-label="Task description" placeholder="Description (Optional)" maxLength={2000} autoSize={{ minRows: 2, maxRows: 4 }} value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
        <Select aria-label="Task repeat frequency" value={draft.repeat} options={REPEATS.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} onChange={(repeat) => patch({ repeat })} />
        <Flex align="center" gap={8} wrap>
          <Typography.Text type="secondary">Repeat every</Typography.Text>
          <InputNumber aria-label="Repeat interval" min={1} max={365} precision={0} value={draft.interval} onChange={(value) => patch({ interval: value ?? 1 })} style={{ width: 80 }} />
          <Typography.Text type="secondary">{UNITS[draft.repeat]}</Typography.Text>
        </Flex>
        {draft.repeat === "weekly" && <Checkbox.Group aria-label="On these days" value={draft.weekdays} onChange={(weekdays) => patch({ weekdays: weekdays as number[] })}><Flex gap={8} wrap>{[1, 2, 3, 4, 5, 6, 0].map((value) => <Checkbox key={value} value={value}>{WEEKDAYS[value].slice(0, 3)}</Checkbox>)}</Flex></Checkbox.Group>}
        {draft.repeat === "monthly" && <Select aria-label="Monthly schedule" value={draft.monthlyMode} options={[{ value: "date", label: "Day of the month" }, { value: "weekday", label: "Weekday of the month" }]} onChange={(monthlyMode) => patch({ monthlyMode })} />}
        {draft.repeat === "yearly" && <Select aria-label="Task month" value={draft.month} options={Array.from({ length: 12 }, (_, value) => ({ value, label: dayjs().month(value).format("MMMM") }))} onChange={(month) => patch({ month })} />}
        {(draft.repeat === "yearly" || (draft.repeat === "monthly" && draft.monthlyMode === "date")) && <>
          <Flex gap={8} align="center" wrap><Typography.Text type="secondary">Day of month</Typography.Text><InputNumber aria-label="Task day of month" min={1} max={31} precision={0} value={draft.monthDay} onChange={(value) => patch({ monthDay: value ?? 1 })} style={{ width: 80 }} /></Flex>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>For shorter months, the last available day is used.</Typography.Text>
        </>}
        {draft.repeat === "monthly" && draft.monthlyMode === "weekday" && <Flex gap={8} wrap>
          <Select aria-label="Week of month" style={{ flex: 1, minWidth: 120 }} value={draft.ordinal} options={[{ value: 1, label: "First" }, { value: 2, label: "Second" }, { value: 3, label: "Third" }, { value: 4, label: "Fourth" }, { value: -1, label: "Last" }]} onChange={(ordinal) => patch({ ordinal })} />
          <Select aria-label="Task weekday" style={{ flex: 1, minWidth: 140 }} value={draft.weekday} options={WEEKDAYS.map((label, value) => ({ label, value }))} onChange={(weekday) => patch({ weekday })} />
        </Flex>}
        {initial.id && <Typography.Text type="secondary">Changes apply to the recurring schedule. Completed days remain saved.</Typography.Text>}
        <Button type="primary" disabled={!valid} onClick={submit}>{initial.id ? "Save changes" : "Add task"}</Button>
        {initial.id && <Button onClick={onCancel}>Cancel editing</Button>}
    </Flex>
  );
}

export function TasksList() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { tasks, tasksReady } = useHealthData();
  const [date, setDate] = useState(todayKey);
  const [editing, setEditing] = useState<Task | null>(null);
  const [manage, setManage] = useState(false);
  const { row, error } = useTaskDay(date, true);
  const due = tasks.filter((task) => taskOccursOn(task, date)).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
  const shown = manage ? [...tasks].sort((a, b) => a.time.localeCompare(b.time)) : due;
  const count = due.filter((task) => row?.completed[task.id]).length;

  return (
    <div style={{ minWidth: 0 }}>
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>Build your routine. Add a task and its schedule, then check it off each day.</Typography.Paragraph>
      <TaskForm key={editing?.id ?? "new"} initial={editing ?? newTask(date)} onSaved={(task) => { if (!editing) setDate(task.startDate); setEditing(null); }} onCancel={() => setEditing(null)} />
      <Flex align="center" gap={8} wrap style={{ marginBottom: 16 }}>
        <Button aria-label="Previous task day" icon={<LeftOutlined />} onClick={() => setDate(dayjs(date).subtract(1, "day").format("YYYY-MM-DD"))} />
        <DatePicker aria-label="Checklist date" allowClear={false} inputReadOnly value={dayjs(date)} onChange={(value) => value && setDate(value.format("YYYY-MM-DD"))} style={{ width: 140 }} />
        <Button aria-label="Next task day" icon={<RightOutlined />} onClick={() => setDate(dayjs(date).add(1, "day").format("YYYY-MM-DD"))} />
        <Button onClick={() => setDate(todayKey())}>Today</Button>
      </Flex>
      <Flex justify="space-between" align="center" gap={8} wrap style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary">{row ? `${count} of ${due.length} completed` : "Loading checklist…"}</Typography.Text>
        <Segmented
          aria-label="Task view"
          options={[
            { label: "Daily checklist", value: "daily" },
            { label: "Manage all tasks", value: "all" },
          ]}
          value={manage ? "all" : "daily"}
          onChange={(value) => setManage(value === "all")}
          style={{ maxWidth: "100%", overflowX: "auto" }}
        />
      </Flex>
      {error && <Alert type="error" title="Could not load this checklist." />}
      {!tasksReady || (!row && !error) ? <Flex justify="center" style={{ padding: 24 }}><Spin /></Flex> : shown.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={manage ? "No tasks yet. Add your first routine." : "No tasks scheduled for this day."} /> : shown.map((task) => {
        const scheduled = taskOccursOn(task, date);
        const checked = !!row?.completed[task.id];
        return <Flex key={task.id} align="flex-start" gap={12} style={{ padding: "16px 0", borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <Checkbox aria-label={`Complete ${plainText(task.title)}`} checked={scheduled && checked} disabled={!scheduled || !row || error} onChange={(event) => {
            if (user) setTaskChecked(user.uid, date, task.id, event.target.checked).catch(() => message.error("Could not update task."));
          }} />
          <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            <Typography.Text strong delete={scheduled && checked}><RichText text={task.title} /></Typography.Text>
            {task.description && <Typography.Paragraph type="secondary" style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}><RichText text={task.description} /></Typography.Paragraph>}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{task.time} · Every {task.interval} {UNITS[task.repeat]}{!scheduled ? " · Not scheduled today" : ""}</Typography.Text>
          </div>
          <Flex gap={2}>
            <Button type="text" size="small" aria-label={`Edit ${plainText(task.title)}`} icon={<EditOutlined />} onClick={() => setEditing(task)} />
            <ConfirmDeleteButton ariaLabel={`Delete ${plainText(task.title)}`} hint="Tap again to delete this recurring task" onConfirm={() => {
              if (!user) return;
              if (editing?.id === task.id) setEditing(null);
              removeTask(user.uid, task.id).catch(() => message.error("Could not delete task."));
            }} />
          </Flex>
        </Flex>;
      })}
    </div>
  );
}
