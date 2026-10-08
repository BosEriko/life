"use client";

import { AppModal } from "@/components/app-modal";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, App, Button, Card, Checkbox, Empty, Flex, Grid, Input, Select, Spin, Tag, Typography, theme } from "antd";
import { CalendarOutlined, CheckCircleOutlined, CheckSquareOutlined, ContainerOutlined, ClockCircleOutlined, EditOutlined, FlagOutlined, FolderOutlined, InboxOutlined, PlusOutlined, SearchOutlined, UnorderedListOutlined, UndoOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeading } from "@/components/page-heading";
import { useHealthData } from "@/components/health-data-provider";
import { useTodoHistory } from "@/components/use-health-history";
import { useTodoDay } from "@/components/use-day-records";
import { TodoEditor } from "@/components/todo-editor";
import { mergeById } from "@/lib/merge-records";
import { todoListName, isKnownList, fixedListOptions, ARCHIVE_LIST_ID, filterTodos, isTodoOverdue, todoListId, todoViewFromQuery, type Todo, type TodoList, type TodoPriority, type TodoSort, type TodoView } from "@/lib/todos";
import { completeTodo, deleteTodo, deleteTodoList, restoreTodo, saveTodoList, setTodoStatus, setTodoSubtask } from "@/models/users/todos";
import { Tip } from "@/components/tip";
import { RichTextView } from "@/components/rich-text-view";
import { EmptyState } from "@/components/empty-state";
import { TodoLinkChip } from "@/components/todo-link-chips";
import { SideMenu } from "@/components/side-menu";

const VIEWS = [
  { value: "all" as const, label: "All to-dos", Icon: UnorderedListOutlined },
  { value: "today" as const, label: "Today", Icon: CalendarOutlined },
  { value: "upcoming" as const, label: "Upcoming", Icon: ClockCircleOutlined },
  { value: "overdue" as const, label: "Overdue", Icon: FlagOutlined },
  { value: "completed" as const, label: "Completed", Icon: CheckCircleOutlined },
];

function ListEditor({ initial, onClose }: { initial: TodoList | null; onClose: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [name, setName] = useState(initial?.name ?? "");
  const submit = () => {
    if (!user || !name.trim()) return;
    saveTodoList(user.uid, { id: initial?.id ?? crypto.randomUUID(), name }).catch(() => message.error("Could not save list."));
    onClose();
  };
  return <AppModal open centered title={initial ? "Rename list" : "New list"} onCancel={onClose} onOk={submit} okText="Save list" okButtonProps={{ disabled: !name.trim() }}>
    <Input aria-label="List name" placeholder="e.g. Work, Home, Personal" autoFocus maxLength={60} value={name} onChange={(event) => setName(event.target.value)} onPressEnter={submit} />
  </AppModal>;
}

function CompletedDetails({ initial, onClose }: { initial: Todo; onClose: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { rows, ready, error } = useTodoDay(initial.date, true);
  const current = rows.find((todo) => todo.id === initial.id);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!pending || !ready || current || error) return;
    const timer = window.setTimeout(onClose, 0);
    return () => window.clearTimeout(timer);
  }, [pending, ready, current, error, onClose]);

  return <AppModal open centered title="Completed to-do" onCancel={onClose} footer={null}>
    {error ? <Alert type="error" title="Could not load this to-do." /> : !ready ? <Spin /> : !current ? <Typography.Text type="secondary">This to-do has been restored or removed.</Typography.Text> : <Flex vertical gap={16}>
      <Typography.Title level={4} style={{ margin: 0, overflowWrap: "anywhere" }}>{current.title}</Typography.Title>
      {current.description && <RichTextView html={current.descriptionHtml} text={current.description} />}
      <Typography.Text type="secondary">Completed {dayjs(current.completedAt ?? current.date).format("MMM D, YYYY · HH:mm")}</Typography.Text>
      {Object.values(current.subtasks).map((subtask) => <Checkbox key={subtask.id} checked={subtask.done} disabled>{subtask.title}</Checkbox>)}
      <Flex gap={8} wrap>
        <Button icon={<UndoOutlined />} disabled={pending} onClick={() => {
          if (!user) return;
          setPending(true);
          restoreTodo(user.uid, current.id).catch(() => { setPending(false); message.error("Could not restore to-do."); });
        }}>Restore to-do</Button>
        <ConfirmDeleteButton ariaLabel="Delete completed to-do" tooltip="Delete" loading={pending} onConfirm={() => {
          if (!user || pending) return;
          setPending(true);
          deleteTodo(user.uid, current.id).catch(() => { setPending(false); message.error("Could not delete to-do."); });
        }} />
      </Flex>
    </Flex>}
  </AppModal>;
}

const COLLAPSED_HEIGHT = "4.6em";
const FADE = "linear-gradient(to bottom, #000 45%, transparent)";

function DescriptionPreview({ todo }: { todo: Todo }) {
  const { token } = theme.useToken();
  const body = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [maxHeight, setMaxHeight] = useState(COLLAPSED_HEIGHT);
  const long = todo.description.length > 160 || todo.description.split("\n").length > 3;

  function toggle() {
    const element = body.current;
    if (!element) return;
    setMaxHeight(`${element.scrollHeight}px`);
    setExpanded(!expanded);
    if (expanded) requestAnimationFrame(() => requestAnimationFrame(() => setMaxHeight(COLLAPSED_HEIGHT)));
  }

  if (!long) return <div style={{ margin: "4px 0", color: token.colorTextSecondary }}><RichTextView html={todo.descriptionHtml} text={todo.description} /></div>;

  return <div style={{ margin: "4px 0", color: token.colorTextSecondary }}>
    <div
      ref={body}
      onTransitionEnd={() => { if (expanded) setMaxHeight("none"); }}
      style={{ maxHeight, overflow: "hidden", transition: "max-height 260ms ease", ...(expanded ? {} : { maskImage: FADE, WebkitMaskImage: FADE }) }}
    >
      <RichTextView html={todo.descriptionHtml} text={todo.description} />
    </div>
    <Button type="link" size="small" aria-expanded={expanded} style={{ padding: 0, height: "auto" }} onClick={toggle}>{expanded ? "Less" : "More"}</Button>
  </div>;
}

export function TodoWorkspace() {
  const { user, loading } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const { todos, todoLists: lists, todosReady, todoError, cutoff } = useHealthData();
  const params = useSearchParams();
  const view = todoViewFromQuery(params.get("view"));
  const listId = params.get("list") || "all";
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<TodoPriority | "all">("all");
  const [status, setStatus] = useState<"all" | "todo" | "doing">("all");
  const [sort, setSort] = useState<TodoSort>("due");
  const [now, setNow] = useState(() => new Date());
  const [editor, setEditor] = useState<Todo | null | undefined>(undefined);
  const [listEditor, setListEditor] = useState<TodoList | null | undefined>(undefined);
  const [reviewing, setReviewing] = useState<Todo | null>(null);
  const history = useTodoHistory(view === "completed", cutoff);
  const all = mergeById(todos, history.todos);
  const selectedList = listId === "all" || isKnownList(listId, lists) ? listId : "inbox";
  const shown = filterTodos(all, lists, { view, listId: selectedList, search, priority, status, sort, now });
  const active = todos.filter((todo) => todo.status !== "done");
  const currentView = VIEWS.find((item) => item.value === view)!;
  const currentList = lists.find((list) => list.id === selectedList);
  const heading = selectedList === "all" ? currentView.label : selectedList === "inbox" ? "Inbox" : selectedList === ARCHIVE_LIST_ID ? "Archive" : lists.find((list) => list.id === selectedList)?.name ?? "Inbox";
  const write = (promise: Promise<void>, error: string) => { promise.catch(() => message.error(error)); };

  function navigateView(nextView: TodoView, nextList = "all") {
    const query = new URLSearchParams(params.toString());
    if (nextView === "all") query.delete("view");
    else query.set("view", nextView);
    if (nextList === "all") query.delete("list");
    else query.set("list", nextList);
    const search = query.toString();
    window.history.pushState(null, "", `/journal/todo${search ? `?${search}` : ""}`);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    const focus = () => setNow(new Date());
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, []);

  if (loading) return <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex>;
  if (!user) return <Empty description="Sign in to organize your to-dos."><Link href="/login"><Button type="primary">Sign in</Button></Link></Empty>;

  const listCount = (id: string) => active.filter((todo) => todoListId(todo, lists) === id).length;

  return <div style={{ paddingRight: screens.md === true ? 56 : 0 }}>
    <PageHeading title="To-do" subtitle="A place for projects, next steps, and everything you want to finish." extra={<Button type="primary" icon={<CheckSquareOutlined />} disabled={!todosReady || todoError} onClick={() => setEditor(null)}>Add to-do</Button>} />
    {todoError && <Alert type="error" title="Could not load your to-dos. Reload to try again." style={{ marginBottom: 16 }} />}
    <div style={{ display: "grid", gridTemplateColumns: screens.lg === true ? "230px minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
      <Flex vertical gap={16} style={{ minWidth: 0 }}>
        <SideMenu
          ariaLabel="To-do views"
          items={VIEWS.map(({ value, label, Icon }) => ({ key: value, icon: <Icon />, label, count: value === "completed" ? undefined : filterTodos(active, lists, { view: value, listId: "all", search: "", priority: "all", status: "all", sort: "due", now }).length }))}
          selectedKey={selectedList === "all" ? view : undefined}
          onSelect={(key) => navigateView(key as TodoView)}
        />
        <SideMenu
          ariaLabel="To-do lists"
          title="Lists"
          extra={<Button type="text" size="small" icon={<PlusOutlined />} aria-label="Add list" disabled={!todosReady || todoError} onClick={() => setListEditor(null)} />}
          items={[
            { key: "inbox", icon: <InboxOutlined />, label: "Inbox", count: listCount("inbox") },
            ...lists.map((list) => ({ key: list.id, icon: <FolderOutlined />, label: list.name, count: listCount(list.id) })),
            { key: ARCHIVE_LIST_ID, icon: <ContainerOutlined />, label: "Archive", count: listCount(ARCHIVE_LIST_ID) },
          ]}
          selectedKey={selectedList === "all" ? undefined : selectedList}
          onSelect={(key) => navigateView("all", key)}
        />
      </Flex>
      <Card styles={{ body: { padding: 20 } }} style={{ minWidth: 0, boxShadow: token.boxShadowTertiary }}>
        <Flex justify="space-between" align="center" gap={12} wrap style={{ marginBottom: 16 }}>
          <Typography.Title level={4} style={{ margin: 0, overflowWrap: "anywhere" }}>{heading}</Typography.Title>
          <Flex align="center" gap={8}>
            <Typography.Text type="secondary">{shown.length} {shown.length === 1 ? "to-do" : "to-dos"}</Typography.Text>
            {currentList && <>
              <Tip title="Rename list"><Button type="text" size="small" icon={<EditOutlined />} aria-label={`Rename list ${currentList.name}`} onClick={() => setListEditor(currentList)} /></Tip>
              <ConfirmDeleteButton ariaLabel={`Delete list ${currentList.name}`} tooltip="Delete list" hint="Tap again to delete this list. Its to-dos move to Inbox." onConfirm={() => { write(deleteTodoList(user.uid, currentList.id), "Could not delete list."); }} />
            </>}
          </Flex>
        </Flex>
        {view === "today" && <Typography.Paragraph type="secondary">Due today, plus unfinished work from earlier days.</Typography.Paragraph>}
        <Input aria-label="Search to-dos" prefix={<SearchOutlined />} placeholder="Search titles, details, lists, or subtasks" allowClear value={search} onChange={(event) => setSearch(event.target.value)} style={{ marginBottom: 12 }} />
        <Flex gap={8} wrap style={{ marginBottom: 20 }}>
          <Select aria-label="Filter list" value={selectedList} onChange={(nextList) => navigateView(view, nextList)} style={{ width: 140 }} options={[{ value: "all", label: "All lists" }, ...fixedListOptions(lists)]} />
          <Select aria-label="Filter priority" value={priority} onChange={setPriority} style={{ width: 140 }} options={[{ value: "all", label: "All priorities" }, ...["high", "medium", "low", "none"].map((value) => ({ value, label: value === "none" ? "No priority" : `${value[0].toUpperCase()}${value.slice(1)} priority` }))]} />
          {view !== "completed" && <Select aria-label="Filter status" value={status} onChange={setStatus} style={{ width: 140 }} options={[{ value: "all", label: "All statuses" }, { value: "todo", label: "To do" }, { value: "doing", label: "In progress" }]} />}
          {view !== "completed" && <Select aria-label="Sort to-dos" value={sort} onChange={setSort} style={{ width: 150 }} options={[{ value: "due", label: "Due date first" }, { value: "priority", label: "Priority first" }, { value: "newest", label: "Newest first" }]} />}
          {(search || priority !== "all" || status !== "all") && <Button type="text" onClick={() => { setSearch(""); setPriority("all"); setStatus("all"); }}>Clear filters</Button>}
        </Flex>
        {!todosReady || (view === "completed" && !history.ready) ? <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex> : shown.length === 0 ? active.length === 0 && view !== "completed" ? <EmptyState title="A fresh start" description="One thing at a time. What’s on your list?" action={<Button type="primary" icon={<CheckSquareOutlined />} disabled={todoError} onClick={() => setEditor(null)}>Add a to-do</Button>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No to-dos match this view." /> : <Flex vertical gap={10}>
          {shown.map((todo) => {
            const subtasks = Object.values(todo.subtasks);
            const completed = todo.status === "done";
            const overdue = isTodoOverdue(todo, now);
            const listName = todoListName(todo, lists);
            return <div key={todo.id} style={{ padding: "14px 16px", borderRadius: token.borderRadius, background: token.colorFillSecondary }}>
              <Flex gap={12} align="flex-start">
                <Checkbox aria-label={`Complete ${todo.title}`} checked={completed} disabled={completed || todoError} onChange={() => write(completeTodo(user.uid, todo), "Could not complete to-do.")} />
                <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                  <Typography.Text strong delete={completed}>{todo.title}</Typography.Text>
                  {todo.description && <DescriptionPreview todo={todo} />}
                  <TodoLinkChip todo={todo} />
                  <Flex gap={8} wrap align="center" style={{ marginTop: 8 }}>
                    {todo.priority !== "none" && <Tag color={todo.priority === "high" ? "red" : todo.priority === "medium" ? "gold" : "blue"}><FlagOutlined /> {todo.priority}</Tag>}
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}><FolderOutlined /> {listName}</Typography.Text>
                    {todo.dueDate && <Typography.Text style={{ fontSize: 12, color: overdue ? token.colorError : token.colorTextSecondary }}><CalendarOutlined /> {dayjs(todo.dueDate).format("MMM D, YYYY")}{todo.dueTime ? ` · ${todo.dueTime}` : ""}{overdue ? " · Overdue" : ""}</Typography.Text>}
                    {completed && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Completed {dayjs(todo.completedAt ?? todo.date).format("MMM D, YYYY")}</Typography.Text>}
                    {!completed && <Button type="text" size="small" onClick={() => write(setTodoStatus(user.uid, todo.id, todo.status === "doing" ? "todo" : "doing"), "Could not update status.")}>{todo.status === "doing" ? "In progress" : "To do"}</Button>}
                  </Flex>
                  {subtasks.length > 0 && <details style={{ marginTop: 10 }}>
                    <summary style={{ cursor: "pointer", fontSize: 12, color: token.colorTextSecondary }}>{subtasks.filter((subtask) => subtask.done).length}/{subtasks.length} subtasks</summary>
                    <Flex vertical gap={8} style={{ marginTop: 10 }}>{subtasks.map((subtask) => <Checkbox key={subtask.id} aria-label={`Complete ${subtask.title}`} checked={subtask.done} disabled={completed || todoError} onChange={(event) => write(setTodoSubtask(user.uid, todo.id, subtask.id, event.target.checked), "Could not update subtask.")}>{subtask.title}</Checkbox>)}</Flex>
                  </details>}
                </div>
                <Flex gap={2}>
                  <Button type="text" size="small" icon={completed ? <UndoOutlined /> : <EditOutlined />} aria-label={completed ? `Review ${todo.title}` : `Edit ${todo.title}`} onClick={() => completed ? setReviewing(todo) : setEditor(todo)} />
                  {!completed && <ConfirmDeleteButton ariaLabel={`Delete ${todo.title}`} tooltip="Delete to-do" onConfirm={() => write(deleteTodo(user.uid, todo.id), "Could not delete to-do.")} />}
                </Flex>
              </Flex>
            </div>;
          })}
        </Flex>}
      </Card>
    </div>
    {editor !== undefined && <TodoEditor initial={editor} lists={lists} listId={selectedList} onClose={() => setEditor(undefined)} />}
    {listEditor !== undefined && <ListEditor initial={listEditor} onClose={() => setListEditor(undefined)} />}
    {reviewing && <CompletedDetails initial={reviewing} onClose={() => { setReviewing(null); history.refresh(); }} />}
  </div>;
}
