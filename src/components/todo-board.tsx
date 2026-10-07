"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Alert, App, Button, Card, Empty, Flex, Grid, Select, Spin, Typography, theme } from "antd";
import { AlignLeftOutlined, CalendarOutlined, CheckCircleOutlined, CheckSquareOutlined, ClockCircleOutlined, UnorderedListOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useTodoHistory } from "@/components/use-health-history";
import { useTodoDay } from "@/components/use-day-records";
import { PageHeading } from "@/components/page-heading";
import { TodoEditor } from "@/components/todo-editor";
import { mergeById } from "@/lib/merge-records";
import { isKnownList, fixedListOptions, ARCHIVE_LIST_ID, isTodoPastDate, todoColumn, todoListId, type Todo, type TodoColumn } from "@/lib/todos";
import { EmptyState } from "@/components/empty-state";
import { moveTodo } from "@/models/users/todos";

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

function BoardEditor({ todo, lists, onClose }: { todo: Todo; lists: Parameters<typeof TodoEditor>[0]["lists"]; onClose: () => void }) {
  const { rows, ready, error } = useTodoDay(todo.date, true);
  const current = rows.find((item) => item.id === todo.id);
  if (!ready || error || !current) return <AppModal open title="Edit to-do" footer={null} onCancel={onClose}>{error ? <Alert type="error" title="Could not load this to-do." /> : !ready ? <Spin /> : <Typography.Text>This to-do was removed or moved. Close and reopen it.</Typography.Text>}</AppModal>;
  return <TodoEditor initial={current} lists={lists} listId="inbox" onClose={onClose} />;
}

type BoardDrag = { id: string; target: TodoColumn | null; x: number; y: number; width: number; offsetX: number; offsetY: number; moved: boolean };

function CardContent({ todo, upcoming }: { todo: Todo; upcoming: boolean }) {
  const subtasks = Object.values(todo.subtasks ?? {});
  const done = subtasks.filter((subtask) => subtask.done).length;
  const showDate = upcoming && !!todo.dueDate;
  const showSubtasks = !upcoming && subtasks.length > 0;
  const hasDescription = !!todo.description?.trim();
  return <>
    <Typography.Text strong style={{ display: "block", overflowWrap: "anywhere", pointerEvents: "none" }}>{todo.title}</Typography.Text>
    {(showDate || showSubtasks || hasDescription) && <Flex align="center" gap={12} wrap style={{ marginTop: 12, fontSize: 12, pointerEvents: "none" }}>
      {showDate && <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        <CalendarOutlined style={{ marginRight: 6 }} />
        {dayjs(todo.dueDate).format("MMM D, YYYY")}
      </Typography.Text>}
      {showSubtasks && <Typography.Text type={done === subtasks.length ? "success" : "secondary"} style={{ fontSize: 12 }}>
        <CheckSquareOutlined style={{ marginRight: 6 }} />
        {done}/{subtasks.length} subtasks
      </Typography.Text>}
      {hasDescription && <Typography.Text type="secondary" style={{ fontSize: 12 }} aria-label="Has description">
        <AlignLeftOutlined />
      </Typography.Text>}
    </Flex>}
  </>;
}

export function TodoBoard() {
  const { user, loading } = useAuth();
  const { todos, todoLists, todosReady, todoError, cutoff } = useHealthData();
  const history = useTodoHistory(true, cutoff);
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const [now, setNow] = useState(() => new Date());
  const [listId, setListId] = useState("all");
  const [editor, setEditor] = useState<Todo | null | undefined>(undefined);
  const [archivedMove, setArchivedMove] = useState<{ todo: Todo; column: TodoColumn } | null>(null);
  const [drag, setDrag] = useState<BoardDrag | null>(null);
  const pointer = useRef<(BoardDrag & { startX: number; startY: number }) | null>(null);
  const suppressClick = useRef(false);
  const rail = useRef<HTMLDivElement>(null);
  const all = mergeById(todos, history.todos);
  const selectedList = listId === "all" || isKnownList(listId, todoLists) ? listId : "inbox";
  const filtered = all.filter((todo) => selectedList === "all" ? todoListId(todo, todoLists) !== ARCHIVE_LIST_ID : todoListId(todo, todoLists) === selectedList);
  const viewHref = (view: string) => `/journal/todo?view=${view}${selectedList === "all" ? "" : `&list=${encodeURIComponent(selectedList)}`}`;
  const draggedTodo = all.find((todo) => todo.id === drag?.id);
  const isDragging = drag !== null;

  useEffect(() => {
    if (!isDragging) return;
    document.body.classList.add("todo-board-grabbing");
    return () => document.body.classList.remove("todo-board-grabbing");
  }, [isDragging]);

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
    if (event.button !== 0 || !event.isPrimary || todoError || archivedMove || pointer.current) return;
    suppressClick.current = false;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current = { id: todo.id, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, width: rect.width, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, moved: false, target: null };
    setDrag({ ...pointer.current });
  }

  function dragMove(event: PointerEvent<HTMLElement>) {
    const current = pointer.current;
    if (!current) return;
    if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 8 && !current.moved) return;
    current.moved = true;
    current.x = event.clientX;
    current.y = event.clientY;
    const column = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-board-column]");
    current.target = column?.dataset.boardColumn as TodoColumn ?? null;
    const rect = rail.current?.getBoundingClientRect();
    if (rect && rail.current) {
      if (event.clientX > rect.right - 40) rail.current.scrollLeft += 24;
      else if (event.clientX < rect.left + 40) rail.current.scrollLeft -= 24;
    }
    if (event.clientY > window.innerHeight - 64) window.scrollBy(0, 20);
    else if (event.clientY < 64) window.scrollBy(0, -20);
    setDrag({ ...current });
  }

  function dragEnd() {
    const current = pointer.current;
    if (!current) return;
    suppressClick.current = !!current?.moved;
    pointer.current = null;
    setDrag(null);
    const todo = all.find((item) => item.id === current?.id);
    if (todo && current?.moved && current.target) move(todo, current.target);
  }

  if (loading) return <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex>;
  if (!user) return <Empty description="Sign in to organize your board."><Link href="/login"><Button type="primary">Sign in</Button></Link></Empty>;

  return <div style={{ minWidth: 0, paddingRight: screens.md === true ? 56 : 0 }}>
    <PageHeading title="Board" subtitle="The same to-dos, organized by what comes next." extra={<>
      <Select aria-label="Filter list" value={selectedList} onChange={setListId} style={{ width: 180, maxWidth: "100%" }} options={[{ value: "all", label: "All lists" }, ...fixedListOptions(todoLists)]} />
      <Button type="primary" icon={<CheckSquareOutlined />} disabled={!todosReady || todoError} onClick={() => setEditor(null)}>Add to-do</Button>
    </>} />
    {todoError && <Alert type="error" title="Could not load your to-dos. Reload to try again." style={{ marginBottom: 16 }} />}
    {todosReady && !todoError && all.length === 0 && <Card styles={{ body: { padding: 24 } }} style={{ marginBottom: 16 }}><EmptyState title="See your plans take shape" description="Add a to-do, then drag it from planned to done." action={<Button type="primary" icon={<CheckSquareOutlined />} onClick={() => setEditor(null)}>Add a to-do</Button>} /></Card>}
    {!todosReady ? <Spin /> : <div ref={rail} tabIndex={0} role="region" aria-label="To-do board" style={{ overflowX: "auto", paddingBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(260px, 1fr))", gap: 16, minWidth: 1088, alignItems: "stretch" }}>
        {COLUMNS.map(({ value, label, Icon }) => {
          const items = filtered.filter((todo) => todoColumn(todo, now) === value).sort((a, b) => value === "done" ? (b.completedAt ?? "").localeCompare(a.completedAt ?? "") : (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") || a.createdAt.localeCompare(b.createdAt));
          const visible = value === "done" || value === "upcoming" ? items.slice(0, 10) : items;
          return <section key={value} data-board-column={value} aria-label={label} style={{ minHeight: 300, padding: 12, borderRadius: token.borderRadiusLG, background: drag?.target === value ? token.colorPrimaryBg : token.colorFillQuaternary, border: `1px solid ${drag?.target === value ? token.colorPrimary : token.colorBorderSecondary}` }}>
            <Flex justify="space-between" align="center" style={{ padding: "4px 4px 16px" }}><Typography.Text strong><Icon style={{ marginRight: 8 }} />{label}</Typography.Text><Typography.Text type="secondary">{items.length}</Typography.Text></Flex>
            <Flex vertical gap={12}>
              {value === "done" && !history.ready && <Spin size="small" />}
              {items.length === 0 && <Typography.Text type="secondary" style={{ padding: "24px 4px", textAlign: "center" }}>No to-dos here</Typography.Text>}
              {visible.map((todo) => <Card key={todo.id} size="small" className="todo-board-card" role="button" tabIndex={todoError || archivedMove ? -1 : 0} aria-label={`Edit ${todo.title}`} aria-disabled={todoError || !!archivedMove} style={{ minWidth: 0, userSelect: "none", touchAction: "none", opacity: drag?.id === todo.id && drag.moved ? 0.25 : 1, boxShadow: token.boxShadowTertiary, ...(isTodoPastDate(todo, now) && todoColumn(todo, now) !== "done" ? { background: token.colorErrorBg, borderColor: token.colorErrorBorder } : {}) }}
                onPointerDown={(event) => dragStart(event, todo)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={() => { suppressClick.current = true; pointer.current = null; setDrag(null); }}
                onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } if (!todoError && !archivedMove) setEditor(todo); }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") { suppressClick.current = true; pointer.current = null; setDrag(null); return; }
                  if (todoError || archivedMove || pointer.current) return;
                  if (event.shiftKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
                    event.preventDefault();
                    const index = COLUMNS.findIndex((column) => column.value === value) + (event.key === "ArrowRight" ? 1 : -1);
                    if (COLUMNS[index]) move(todo, COLUMNS[index].value);
                  } else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setEditor(todo); }
                }}><CardContent todo={todo} upcoming={value === "upcoming"} /></Card>)}
              {items.length > visible.length && <Link href={viewHref(value === "done" ? "completed" : "upcoming")} className="board-more" style={{ "--board-more-bg": token.colorPrimaryBg, "--board-more-hover": token.colorPrimaryBgHover, color: token.colorPrimary } as CSSProperties}>And {items.length - visible.length} more…</Link>}
            </Flex>
          </section>;
        })}
      </div>
    </div>}
    {drag?.moved && draggedTodo && createPortal(<Card size="small" aria-hidden className="todo-board-drag-preview" style={{ position: "fixed", left: drag.x - drag.offsetX, top: drag.y - drag.offsetY, width: drag.width, pointerEvents: "none", zIndex: 1100, transform: "rotate(4deg)", boxShadow: token.boxShadow, ...(isTodoPastDate(draggedTodo, now) && todoColumn(draggedTodo, now) !== "done" ? { background: token.colorErrorBg, borderColor: token.colorErrorBorder } : {}) }}><CardContent todo={draggedTodo} upcoming={todoColumn(draggedTodo, now) === "upcoming"} /></Card>, document.body)}
    {editor === null && <TodoEditor initial={null} lists={todoLists} listId={selectedList === "all" ? "inbox" : selectedList} onClose={() => setEditor(undefined)} />}
    {editor && <BoardEditor key={editor.id} todo={editor} lists={todoLists} onClose={() => { setEditor(undefined); history.refresh(); }} />}
    {archivedMove && <ArchivedMove key={archivedMove.todo.id} {...archivedMove} onClose={() => { setArchivedMove(null); history.refresh(); }} />}
  </div>;
}
