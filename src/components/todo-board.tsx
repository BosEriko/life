"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { Alert, App, Button, Card, Empty, Flex, Grid, Select, Spin, Tag, Typography, theme } from "antd";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DragOutlined, EditOutlined, PlusOutlined, UnorderedListOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useTodoHistory } from "@/components/use-health-history";
import { useTodoDay } from "@/components/use-day-records";
import { PageHeading } from "@/components/page-heading";
import { TodoEditor } from "@/components/todo-editor";
import { mergeById } from "@/lib/merge-records";
import { todoColumn, type Todo, type TodoColumn } from "@/lib/todos";
import { moveTodo } from "@/models/todos";

const COLUMNS = [
  { value: "upcoming" as const, label: "Upcoming", Icon: CalendarOutlined },
  { value: "todo" as const, label: "To do", Icon: UnorderedListOutlined },
  { value: "doing" as const, label: "In progress", Icon: ClockCircleOutlined },
  { value: "done" as const, label: "Completed", Icon: CheckCircleOutlined },
];

function ArchivedMove({ todo, column, onClose }: { todo: Todo; column: TodoColumn; onClose: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { rows, ready, error } = useTodoDay(todo.date, true);
  const submitted = useRef(false);
  const current = rows.find((item) => item.id === todo.id);
  useEffect(() => {
    if (!ready) return;
    if (error || !current) {
      const timer = window.setTimeout(() => {
        if (error) message.error("Could not load this to-do.");
        onClose();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (!user || submitted.current) return;
    submitted.current = true;
    moveTodo(user.uid, current, column).catch(() => { message.error("Could not move to-do."); onClose(); });
  }, [ready, error, current, user, column, message, onClose]);
  return <AppModal open title="Moving completed to-do" footer={null} closable={false} keyboard={false} mask={{ closable: false }}><Spin /> <Typography.Text>Updating {todo.title}…</Typography.Text></AppModal>;
}

export function TodoBoard() {
  const { user, loading } = useAuth();
  const { todos, todoLists, todosReady, todoError, cutoff } = useHealthData();
  const history = useTodoHistory(true, cutoff);
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const [now, setNow] = useState(() => new Date());
  const [editor, setEditor] = useState<Todo | null | undefined>(undefined);
  const [archivedMove, setArchivedMove] = useState<{ todo: Todo; column: TodoColumn } | null>(null);
  const [drag, setDrag] = useState<{ id: string; target: TodoColumn | null } | null>(null);
  const pointer = useRef<{ id: string; x: number; y: number; moved: boolean; target: TodoColumn | null } | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const all = mergeById(todos, history.todos);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); };
  }, []);

  function move(todo: Todo, column: TodoColumn) {
    if (!user || todoError || archivedMove || todoColumn(todo, new Date()) === column) return;
    if (todo.date < cutoff) setArchivedMove({ todo, column });
    else moveTodo(user.uid, todo, column).catch(() => message.error("Could not move to-do."));
  }

  function dragStart(event: PointerEvent<HTMLElement>, todo: Todo) {
    if (event.button !== 0 || todoError || archivedMove) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: todo.id, x: event.clientX, y: event.clientY, moved: false, target: null };
  }

  function dragMove(event: PointerEvent<HTMLElement>) {
    const current = pointer.current;
    if (!current) return;
    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < 8 && !current.moved) return;
    current.moved = true;
    const column = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-board-column]");
    current.target = column?.dataset.boardColumn as TodoColumn ?? null;
    setDrag({ id: current.id, target: current.target });
    const rect = rail.current?.getBoundingClientRect();
    if (rect && rail.current) {
      if (event.clientX > rect.right - 40) rail.current.scrollLeft += 24;
      else if (event.clientX < rect.left + 40) rail.current.scrollLeft -= 24;
    }
    if (event.clientY > window.innerHeight - 64) window.scrollBy(0, 20);
    else if (event.clientY < 64) window.scrollBy(0, -20);
  }

  function dragEnd() {
    const current = pointer.current;
    pointer.current = null;
    setDrag(null);
    const todo = all.find((item) => item.id === current?.id);
    if (todo && current?.moved && current.target) move(todo, current.target);
  }

  if (loading) return <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex>;
  if (!user) return <Empty description="Sign in to organize your board."><Link href="/login"><Button type="primary">Sign in</Button></Link></Empty>;

  return <div style={{ minWidth: 0, paddingRight: screens.md === true ? 56 : 0 }}>
    <PageHeading title="Board" subtitle="The same to-dos, organized by what comes next." extra={<Button type="primary" icon={<PlusOutlined />} disabled={!todosReady || todoError} onClick={() => setEditor(null)}>Add to-do</Button>} />
    <Typography.Paragraph type="secondary">Drag a card using its handle, or choose Move to. Upcoming schedules it for tomorrow; moving a future to-do into To do makes it due today.</Typography.Paragraph>
    {todoError && <Alert type="error" title="Could not load your to-dos. Reload to try again." style={{ marginBottom: 16 }} />}
    {!todosReady ? <Spin /> : <div ref={rail} tabIndex={0} role="region" aria-label="To-do board" style={{ overflowX: "auto", paddingBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(260px, 1fr))", gap: 16, minWidth: 1088, alignItems: "start" }}>
        {COLUMNS.map(({ value, label, Icon }) => {
          const items = all.filter((todo) => todoColumn(todo, now) === value).sort((a, b) => value === "done" ? (b.completedAt ?? "").localeCompare(a.completedAt ?? "") : (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") || a.createdAt.localeCompare(b.createdAt));
          return <section key={value} data-board-column={value} aria-label={label} style={{ minHeight: 300, padding: 12, borderRadius: token.borderRadiusLG, background: drag?.target === value ? token.colorPrimaryBg : token.colorFillQuaternary, border: `1px solid ${drag?.target === value ? token.colorPrimary : token.colorBorderSecondary}` }}>
            <Flex justify="space-between" align="center" style={{ padding: "4px 4px 16px" }}><Typography.Text strong><Icon style={{ marginRight: 8 }} />{label}</Typography.Text><Typography.Text type="secondary">{items.length}</Typography.Text></Flex>
            <Flex vertical gap={12}>
              {value === "done" && !history.ready && <Spin size="small" />}
              {items.length === 0 && <Typography.Text type="secondary" style={{ padding: "24px 4px", textAlign: "center" }}>No to-dos here</Typography.Text>}
              {items.map((todo) => {
                const steps = Object.values(todo.subtasks);
                return <Card key={todo.id} size="small" style={{ minWidth: 0, opacity: drag?.id === todo.id ? 0.55 : 1, boxShadow: token.boxShadowTertiary }}>
                  <Flex gap={8} align="flex-start">
                    <Button type="text" size="small" icon={<DragOutlined />} aria-label={`Drag ${todo.title}`} disabled={todoError || !!archivedMove} style={{ touchAction: "none", cursor: "grab", flexShrink: 0 }} onPointerDown={(event) => dragStart(event, todo)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={() => { pointer.current = null; setDrag(null); }} />
                    <Typography.Text strong style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{todo.title}</Typography.Text>
                    {todoColumn(todo, now) !== "done" && <Button type="text" size="small" icon={<EditOutlined />} aria-label={`Edit ${todo.title}`} disabled={todoError} onClick={() => setEditor(todo)} />}
                  </Flex>
                  {todo.description && <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ margin: "8px 0", overflowWrap: "anywhere" }}>{todo.description}</Typography.Paragraph>}
                  <Flex gap={6} wrap style={{ margin: "10px 0" }}>
                    {todo.priority !== "none" && <Tag color={todo.priority === "high" ? "red" : todo.priority === "medium" ? "gold" : "blue"}>{todo.priority}</Tag>}
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{todoLists.find((list) => list.id === todo.listId)?.name ?? "Inbox"}</Typography.Text>
                  </Flex>
                  {todo.dueDate && <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}><CalendarOutlined /> {dayjs(todo.dueDate).format("MMM D, YYYY")}{todo.dueTime ? ` · ${todo.dueTime}` : ""}</Typography.Paragraph>}
                  {steps.length > 0 && <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>{steps.filter((step) => step.done).length}/{steps.length} subtasks</Typography.Paragraph>}
                  <Select aria-label={`Move ${todo.title} to`} placeholder="Move to…" value={undefined} disabled={todoError || !!archivedMove} style={{ width: "100%" }} options={COLUMNS.filter((column) => column.value !== value).map((column) => ({ value: column.value, label: column.label }))} onChange={(column: TodoColumn) => move(todo, column)} />
                </Card>;
              })}
            </Flex>
          </section>;
        })}
      </div>
    </div>}
    {editor !== undefined && <TodoEditor initial={editor} lists={todoLists} listId="inbox" onClose={() => setEditor(undefined)} />}
    {archivedMove && <ArchivedMove key={archivedMove.todo.id} {...archivedMove} onClose={() => { setArchivedMove(null); history.refresh(); }} />}
  </div>;
}
