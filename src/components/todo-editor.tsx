"use client";

import { AppModal } from "@/components/app-modal";

import { useState } from "react";
import { App, Button, Checkbox, DatePicker, Flex, Form, Input, Select, TimePicker, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { ACTIVE_TODO_DATE, TODO_PRIORITIES, todoValidation, type Todo, type TodoList } from "@/lib/todos";
import { saveTodo } from "@/models/todos";

export function TodoEditor({ initial, lists, listId, onClose }: {
  initial: Todo | null;
  lists: TodoList[];
  listId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Todo>(() => initial ?? {
    id: "", date: ACTIVE_TODO_DATE, title: "", description: "",
    listId: lists.some((list) => list.id === listId) ? listId : null,
    priority: "none", status: "todo", dueDate: null, dueTime: null,
    subtasks: {}, createdAt: new Date().toISOString(), updatedAt: "", completedAt: null,
  });
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const patch = (next: Partial<Todo>) => setDraft((current) => ({ ...current, ...next }));
  const validation = todoValidation(draft);

  function addSubtask() {
    if (!subtaskTitle.trim() || Object.keys(draft.subtasks).length >= 50) return;
    const id = crypto.randomUUID();
    patch({ subtasks: { ...draft.subtasks, [id]: { id, title: subtaskTitle.trim(), done: false } } });
    setSubtaskTitle("");
  }

  function submit() {
    if (!user || validation) return;
    const now = new Date();
    saveTodo(user.uid, {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      date: draft.status === "done" ? draft.completedAt ? draft.date : dayjs(now).format("YYYY-MM-DD") : ACTIVE_TODO_DATE,
      completedAt: draft.status === "done" ? draft.completedAt ?? now.toISOString() : null,
    }).catch(() => message.error("Could not save to-do."));
    onClose();
    message.success(navigator.onLine ? "To-do saved" : "Saved offline · will sync");
  }

  return (
    <AppModal open centered title={initial ? "Edit to-do" : "Add to-do"} onCancel={onClose} footer={null}>
      <Typography.Paragraph type="secondary">Give it a clear next step. Add a deadline or break it into smaller steps.</Typography.Paragraph>
      <Form layout="vertical" onFinish={submit}>
        <Form.Item label="Title" required>
          <Input aria-label="To-do title" autoFocus maxLength={120} placeholder="What needs to get done?" value={draft.title} onChange={(event) => patch({ title: event.target.value })} />
        </Form.Item>
        <Form.Item label="Description">
          <Input.TextArea aria-label="To-do description" maxLength={2000} autoSize={{ minRows: 2 }} placeholder="Details, context, or a helpful link" value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
        </Form.Item>
        <Flex gap={12} wrap>
          <Form.Item label="List" style={{ flex: 1, minWidth: 140 }}>
            <Select aria-label="To-do list" value={lists.some((list) => list.id === draft.listId) ? draft.listId : "inbox"} options={[{ value: "inbox", label: "Inbox" }, ...lists.map((list) => ({ value: list.id, label: list.name }))]} onChange={(value) => patch({ listId: value === "inbox" ? null : value })} />
          </Form.Item>
          <Form.Item label="Priority" style={{ flex: 1, minWidth: 120 }}>
            <Select aria-label="To-do priority" value={draft.priority} options={TODO_PRIORITIES.map((value) => ({ value, label: value === "none" ? "No priority" : `${value[0].toUpperCase()}${value.slice(1)}` }))} onChange={(priority) => patch({ priority })} />
          </Form.Item>
        </Flex>
        <Flex gap={12} wrap>
          <Form.Item label="Due date" style={{ flex: 1, minWidth: 150 }}>
            <DatePicker aria-label="To-do due date" inputReadOnly value={draft.dueDate ? dayjs(draft.dueDate) : null} onChange={(date) => patch({ dueDate: date?.format("YYYY-MM-DD") ?? null, dueTime: date ? draft.dueTime : null })} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Time (optional)">
            <TimePicker aria-label="To-do due time" disabled={!draft.dueDate} format="HH:mm" needConfirm={false} value={draft.dueDate && draft.dueTime ? dayjs(`${draft.dueDate}T${draft.dueTime}`) : null} onChange={(time) => patch({ dueTime: time?.format("HH:mm") ?? null })} style={{ width: 120 }} />
          </Form.Item>
        </Flex>
        <Form.Item label="Status">
          <Select aria-label="To-do status" value={draft.status} options={[{ value: "todo", label: "To do" }, { value: "doing", label: "In progress" }, ...(initial?.status === "done" ? [{ value: "done", label: "Completed" }] : [])]} onChange={(status) => patch({ status })} />
        </Form.Item>
        <Form.Item label="Subtasks">
          <Flex vertical gap={8}>
            {Object.values(draft.subtasks).map((subtask) => (
              <Flex key={subtask.id} gap={8} align="center">
                <Checkbox aria-label={`Complete subtask ${subtask.title}`} checked={subtask.done} onChange={(event) => patch({ subtasks: { ...draft.subtasks, [subtask.id]: { ...subtask, done: event.target.checked } } })} />
                <Input aria-label="Subtask title" value={subtask.title} maxLength={120} onChange={(event) => patch({ subtasks: { ...draft.subtasks, [subtask.id]: { ...subtask, title: event.target.value } } })} style={{ minWidth: 0 }} />
                <Button type="text" danger aria-label={`Remove subtask ${subtask.title}`} icon={<DeleteOutlined />} onClick={() => patch({ subtasks: Object.fromEntries(Object.entries(draft.subtasks).filter(([id]) => id !== subtask.id)) })} />
              </Flex>
            ))}
            <Flex gap={8}>
              <Input aria-label="New subtask" placeholder="Add a small step" maxLength={120} value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} onPressEnter={(event) => { event.preventDefault(); addSubtask(); }} style={{ minWidth: 0 }} />
              <Button aria-label="Add subtask" icon={<PlusOutlined />} disabled={!subtaskTitle.trim() || Object.keys(draft.subtasks).length >= 50} onClick={addSubtask} />
            </Flex>
          </Flex>
        </Form.Item>
        {validation && draft.title.trim() && <Typography.Paragraph type="danger">{validation}</Typography.Paragraph>}
        <Button type="primary" htmlType="submit" block disabled={!!validation}>{initial ? "Save changes" : "Add to-do"}</Button>
      </Form>
    </AppModal>
  );
}
