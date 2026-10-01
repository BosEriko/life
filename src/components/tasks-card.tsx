"use client";

import { AppModal } from "@/components/app-modal";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Alert, App, Button, Checkbox, DatePicker, Empty, Flex, Input, InputNumber, Select, Spin, TimePicker, Typography, theme } from "antd";
import { AlignLeftOutlined, ClockCircleOutlined, ScheduleOutlined, EditOutlined, LeftOutlined, RightOutlined, SyncOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useTaskDay } from "@/components/use-day-records";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { RichText, plainText } from "@/components/rich-text";
import { Tip } from "@/components/tip";
import { formatTaskTime, taskOccursOn, type Task } from "@/lib/task-schedule";
import { removeTask, saveTask, setTaskChecked } from "@/models/tasks";
import { todayKey } from "@/models/dailies";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const REPEATS = ["daily", "weekly", "monthly", "yearly"] as const;
const UNITS = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };
const unit = (repeat: Task["repeat"], interval: number) => `${UNITS[repeat]}${interval === 1 ? "" : "s"}`;

const ORDINALS: Record<number, string> = { 1: "first", 2: "second", 3: "third", 4: "fourth", [-1]: "last" };

function scheduleHint(task: Task) {
  if (task.repeat === "weekly") return [...task.weekdays].sort((a, b) => a - b).map((day) => WEEKDAYS[day]).join(", ");
  if (task.repeat === "monthly") return task.monthlyMode === "weekday" ? `On the ${ORDINALS[task.ordinal]} ${WEEKDAYS[task.weekday]}` : `On day ${task.monthDay}`;
  if (task.repeat === "yearly") return `On ${dayjs().month(task.month).format("MMMM")} ${task.monthDay}`;
  return undefined;
}

function newTask(date: string): Task {
  const start = dayjs(date);
  return { id: "", title: "", description: "", time: "09:00", startDate: date, repeat: "daily", interval: 1, weekdays: [start.day()], monthlyMode: "date", monthDay: start.date(), ordinal: 1, weekday: start.day(), month: start.month() };
}

function TaskForm({ initial, onSaved, onCancel }: { initial: Task; onSaved: (task: Task) => void; onCancel?: () => void }) {
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
    <Flex vertical gap={10}>
        <Flex gap={8} wrap>
          <DatePicker aria-label="Task start date" allowClear={false} inputReadOnly value={dayjs(draft.startDate)} onChange={(date) => date && patch({ startDate: date.format("YYYY-MM-DD") })} style={{ flex: 1, minWidth: 150 }} />
          <TimePicker aria-label="Task time" format="h:mm A" use12Hours needConfirm={false} allowClear={false} value={dayjs(`${draft.startDate}T${draft.time}`)} onChange={(time) => time && patch({ time: time.format("HH:mm") })} style={{ width: 130 }} />
        </Flex>
        <Input aria-label="Task title" placeholder="Task title" prefix={<ScheduleOutlined style={{ opacity: 0.45 }} />} maxLength={120} value={draft.title} onChange={(event) => patch({ title: event.target.value })} autoFocus />
        <Input.TextArea aria-label="Task description" placeholder="Description (Optional)" maxLength={2000} autoSize={{ minRows: 2, maxRows: 4 }} value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
        <Select aria-label="Task repeat frequency" value={draft.repeat} options={REPEATS.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} onChange={(repeat) => patch({ repeat })} />
        <Flex align="center" gap={8} wrap>
          <Typography.Text type="secondary">Repeat every</Typography.Text>
          <InputNumber aria-label="Repeat interval" min={1} max={365} precision={0} value={draft.interval} onChange={(value) => patch({ interval: value ?? 1 })} style={{ width: 80 }} />
          <Typography.Text type="secondary">{unit(draft.repeat, draft.interval)}</Typography.Text>
        </Flex>
        {draft.repeat === "weekly" && <Checkbox.Group aria-label="On these days" value={draft.weekdays} onChange={(weekdays) => patch({ weekdays: weekdays as number[] })}><Flex gap={8} wrap>{WEEKDAYS.map((label, value) => <Checkbox key={value} value={value}>{label.slice(0, 3)}</Checkbox>)}</Flex></Checkbox.Group>}
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
        {initial.id && <Button onClick={onCancel}>Cancel</Button>}
    </Flex>
  );
}

export function AddTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return (
    <AppModal open={open} centered title={<><ScheduleOutlined style={{ marginRight: 8 }} />New task</>} footer={null} onCancel={onClose} destroyOnHidden>
      {open && <TaskForm initial={newTask(todayKey())} onSaved={onClose} />}
      {pathname !== "/journal/tasks" && (
        <Flex justify="center" style={{ marginTop: 12 }}>
          <Link href="/journal/tasks" onClick={onClose}>See all tasks in Journal</Link>
        </Flex>
      )}
    </AppModal>
  );
}

export type TaskView = "today" | Task["repeat"];

export function TasksList({ view = "today" }: { view?: TaskView }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { tasks, tasksReady } = useHealthData();
  const [date, setDate] = useState(todayKey);
  const [editing, setEditing] = useState<Task | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const manage = view !== "today";
  const { row, error } = useTaskDay(date, !manage);
  const due = tasks.filter((task) => taskOccursOn(task, date)).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
  const shown = manage ? tasks.filter((task) => task.repeat === view).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title)) : due;
  const count = due.filter((task) => row?.completed[task.id]).length;

  return (
    <div style={{ minWidth: 0 }}>
      <AppModal open={editOpen} centered title={<><ScheduleOutlined /> Edit task</>} footer={null} onCancel={() => setEditOpen(false)} afterClose={() => setEditing(null)}>
        {editing && <TaskForm key={editing.id} initial={editing} onSaved={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} />}
      </AppModal>
      {!manage && <Flex align="center" gap={8} wrap style={{ marginBottom: 16 }}>
        <Button aria-label="Previous task day" icon={<LeftOutlined />} onClick={() => setDate(dayjs(date).subtract(1, "day").format("YYYY-MM-DD"))} />
        <DatePicker aria-label="Checklist date" allowClear={false} inputReadOnly value={dayjs(date)} onChange={(value) => value && setDate(value.format("YYYY-MM-DD"))} style={{ width: 140 }} />
        <Button aria-label="Next task day" icon={<RightOutlined />} onClick={() => setDate(dayjs(date).add(1, "day").format("YYYY-MM-DD"))} />
        <Button onClick={() => setDate(todayKey())}>Today</Button>
      </Flex>}
      <Typography.Paragraph type="secondary">{manage ? `${shown.length} ${view} ${shown.length === 1 ? "task" : "tasks"}` : row ? `${count} of ${due.length} completed` : "Loading checklist…"}</Typography.Paragraph>
      {!manage && error && <Alert type="error" title="Could not load this checklist." />}
      {!tasksReady || (!manage && !row && !error) ? <Flex justify="center" style={{ padding: 24 }}><Spin /></Flex> : shown.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={manage ? `No ${view} tasks yet.` : "No tasks scheduled for this day."} /> : shown.map((task) => {
        const scheduled = taskOccursOn(task, date);
        const checked = !!row?.completed[task.id];
        return <Flex key={task.id} align="flex-start" gap={12} style={{ padding: "16px 0", borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          {!manage && <Checkbox aria-label={`Complete ${plainText(task.title)}`} checked={scheduled && checked} disabled={!scheduled || !row || error} onChange={(event) => {
            if (user) setTaskChecked(user.uid, date, task.id, event.target.checked).catch(() => message.error("Could not update task."));
          }} />}
          <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            <Typography.Text strong delete={!manage && scheduled && checked}><RichText text={task.title} /></Typography.Text>
            {task.description && <Flex gap={8} align="baseline" style={{ margin: "4px 0" }}><Typography.Text type="secondary"><AlignLeftOutlined /></Typography.Text><Typography.Paragraph type="secondary" style={{ margin: 0, whiteSpace: "pre-wrap", minWidth: 0 }}><RichText text={task.description} /></Typography.Paragraph></Flex>}
            <Flex gap={12} wrap style={{ fontSize: 12 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}><ClockCircleOutlined style={{ marginRight: 6 }} />{formatTaskTime(task.time)}</Typography.Text>
              <Tip title={scheduleHint(task)}><Typography.Text type="secondary" style={{ fontSize: 12 }}><SyncOutlined style={{ marginRight: 6 }} />{task.interval === 1 ? `Every ${UNITS[task.repeat]}` : `Every ${task.interval} ${unit(task.repeat, task.interval)}`}</Typography.Text></Tip>
            </Flex>
          </div>
          <Flex gap={2}>
            <Button type="text" size="small" aria-label={`Edit ${plainText(task.title)}`} icon={<EditOutlined />} onClick={() => { setEditing(task); setEditOpen(true); }} />
            <ConfirmDeleteButton ariaLabel={`Delete ${plainText(task.title)}`} hint="Tap again to delete this recurring task" onConfirm={() => {
              if (!user) return;
              if (editing?.id === task.id) setEditOpen(false);
              removeTask(user.uid, task.id).catch(() => message.error("Could not delete task."));
            }} />
          </Flex>
        </Flex>;
      })}
    </div>
  );
}
