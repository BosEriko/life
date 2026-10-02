"use client";


import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  App,
  Button,
  Calendar,
  Card,
  Empty,
  Flex,
  Grid,
  Segmented,
  Spin,
  Typography,
  theme,
} from "antd";
import {
  CalendarFilled,
  CalendarOutlined,
  CheckSquareFilled,
  CheckSquareOutlined,
  ClockCircleOutlined,
  EditOutlined,
  LeftOutlined,
  RightOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Icon } from "@/components/icon";
import { NotesModal } from "@/components/notes-modal";
import { relativeDate, todayKey } from "@/models/users/dailies";
import {
  deleteNote,
  formatNoteTime,
  moveNoteToDate,
  sortNotes,
  watchNotes,
  type Note,
} from "@/models/users/notes";
import { PageHeading } from "@/components/page-heading";
import { journalViewUrl, noteDateFromQuery } from "@/lib/journal-views";
import { RichTextView } from "@/components/rich-text-view";
import { plainTextToHtml } from "@/components/rich-text-editor";
import { ACTIVE_TODO_DATE, todoValidation, type Todo } from "@/lib/todos";
import { convertNoteToTodo } from "@/models/users/todos";
import { JournalSkeleton } from "@/components/journal-skeleton";
import { SideMenu } from "@/components/side-menu";

export default function NotesPage() {
  return <Suspense fallback={<JournalSkeleton />}><NotesContent /></Suspense>;
}

function NotesContent() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const params = useSearchParams();
  const selectedDateKey = noteDateFromQuery(params.get("view"), todayKey());
  const date = dayjs(selectedDateKey);
  const [notesOpen, setNotesOpen] = useState(false);
  const [datesView, setDatesView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    if (!user) return;
    return watchNotes(
      user.uid,
      (next) => {
        setNotes(next);
        setLoaded(true);
      },
      () => {
        message.error("Could not load your notes.");
        setLoaded(true);
      },
    );
  }, [user, message]);

  function handleDelete(id: string) {
    if (!user) return;
    deleteNote(user.uid, id).catch(() =>
      message.error("Could not delete note."),
    );
  }

  function handleMoveToToday(id: string) {
    if (!user) return;
    moveNoteToDate(user.uid, id, todayKey()).catch(() =>
      message.error("Could not move note."),
    );
  }

  function handleConvert(note: Note) {
    if (!user) return;
    const plain = note.text.replace(/\s+/g, " ").trim();
    const todo: Todo = {
      id: crypto.randomUUID(),
      date: ACTIVE_TODO_DATE,
      title: plain.slice(0, 120),
      description: note.text.trim(),
      descriptionHtml: note.html ?? plainTextToHtml(note.text),
      listId: null,
      priority: "none",
      status: "todo",
      dueDate: null,
      dueTime: null,
      subtasks: {},
      createdAt: new Date().toISOString(),
      updatedAt: "",
      completedAt: null,
    };
    if (todo.description.length > 2000) {
      message.error("This note is too long to become a to-do (2,000 characters max).");
      return;
    }
    const invalid = todoValidation(todo);
    if (invalid) {
      message.error(invalid);
      return;
    }
    convertNoteToTodo(user.uid, note.id, todo).catch(() =>
      message.error("Could not convert note."),
    );
    message.success(navigator.onLine ? "Note moved to To-do" : "Saved offline · will sync");
  }

  const sortedNotes = useMemo(() => sortNotes(notes), [notes]);
  const datesWithNotes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of sortedNotes) {
      counts.set(note.date, (counts.get(note.date) ?? 0) + 1);
    }
    return Array.from(counts, ([key, count]) => ({ key, count }));
  }, [sortedNotes]);
  const noteCounts = new Set(datesWithNotes.map(({ key }) => key));
  const shown = sortedNotes.filter((note) => note.date === selectedDateKey);

  const isToday = date.isSame(dayjs(todayKey()), "day");

  function setDate(next: Dayjs) {
    const key = next.format("YYYY-MM-DD");
    if (params.get("view") === key) return;
    window.history.pushState(null, "", journalViewUrl(window.location.pathname, params.toString(), key, window.location.hash));
  }

  function changeDay(amount: number) {
    setDate(date.add(amount, "day"));
  }

  return (
    <div>
      <PageHeading
        title="Notes"
        subtitle="A private journal beside your health entries."
        extra={
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => setNotesOpen(true)}
        >
          Write note
        </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: screens.md === true
            ? "minmax(220px, 280px) minmax(0, 1fr)"
            : "minmax(0, 1fr)",
          gap: 32,
          alignItems: "start",
        }}
      >
        <SideMenu
          ariaLabel="Dates with notes"
          title="Dates with notes"
          extra={
            <Segmented
              size="small"
              aria-label="Dates view"
              value={datesView}
              onChange={(value) => setDatesView(value as "list" | "calendar")}
              options={[
                { value: "list", icon: <UnorderedListOutlined />, title: "List" },
                { value: "calendar", icon: <CalendarOutlined />, title: "Calendar" },
              ]}
            />
          }
          items={loaded ? datesWithNotes.map(({ key, count }) => ({ key, label: dayjs(key).format("MMMM D, YYYY"), count })) : []}
          selectedKey={selectedDateKey}
          onSelect={(key) => setDate(dayjs(key))}
          empty={loaded ? <Typography.Text type="secondary">No notes yet.</Typography.Text> : <Flex justify="center"><Spin size="small" /></Flex>}
        >
          {datesView === "calendar" ? (
            <Calendar
              key={selectedDateKey}
              fullscreen={false}
              defaultValue={date}
              disabledDate={(day) => day.isAfter(dayjs(todayKey()), "day")}
              headerRender={({ value, onChange }) => (
                <Flex align="center" justify="space-between" style={{ padding: "8px 0" }}>
                  <Button type="text" size="small" aria-label="Previous month" icon={<LeftOutlined />} onClick={() => onChange(value.subtract(1, "month"))} />
                  <Typography.Text strong>{value.format("MMMM YYYY")}</Typography.Text>
                  <Button
                    type="text"
                    size="small"
                    aria-label="Next month"
                    icon={<RightOutlined />}
                    disabled={value.add(1, "month").startOf("month").isAfter(dayjs(todayKey()))}
                    onClick={() => onChange(value.add(1, "month"))}
                  />
                </Flex>
              )}
              onSelect={(day, info) => {
                if (info.source === "date") setDate(day);
              }}
              fullCellRender={(day, info) => {
                if (info.type !== "date") return info.originNode;
                const hasNotes = noteCounts.has(day.format("YYYY-MM-DD"));
                return (
                  <div className="ant-picker-cell-inner" style={{ position: "relative" }}>
                    {day.date()}
                    {hasNotes ? (
                      <span
                        aria-hidden
                        style={{ position: "absolute", left: "50%", bottom: 1, width: 4, height: 4, marginLeft: -2, borderRadius: "50%", background: "currentColor" }}
                      />
                    ) : null}
                  </div>
                );
              }}
              style={{ padding: "0 8px 8px" }}
            />
          ) : null}
        </SideMenu>

        <Card
          styles={{ body: { padding: 20 } }}
          style={{ minWidth: 0, boxShadow: token.boxShadowTertiary }}
        >
          <Flex align="center" justify="space-between" gap={12} wrap style={{ marginBottom: 20 }}>
          <Typography.Text style={{ fontSize: 17 }}>
            {date.format("dddd, MMMM D, YYYY")}
          </Typography.Text>
          <Flex align="center" gap={8} wrap>
            <Button
              aria-label="Previous day"
              icon={<LeftOutlined />}
              onClick={() => changeDay(-1)}
            />
            <Button
              aria-label="Next day"
              icon={<RightOutlined />}
              disabled={isToday}
              onClick={() => changeDay(1)}
            />
            <Button
              icon={
                <Icon name="date" style={{ marginRight: 0, opacity: 1 }} />
              }
              disabled={isToday}
              onClick={() => setDate(dayjs(todayKey()))}
            >
              Today
            </Button>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {shown.length} {shown.length === 1 ? "note" : "notes"}
            </Typography.Text>
          </Flex>
          </Flex>

          {!loaded ? (
            <Flex justify="center" style={{ padding: 24 }}>
              <Spin />
            </Flex>
          ) : shown.length === 0 ? (
            <Empty description="No notes on this day." />
          ) : (
            <Flex vertical gap={12}>
              {shown.map((note) => (
                <div
                  key={note.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: token.borderRadius,
                    background: token.colorFillSecondary,
                  }}
                >
                  <Flex
                    align="flex-start"
                    justify="space-between"
                    gap={12}
                  >
                    <Flex vertical gap={4}>
                      <RichTextView html={note.html} text={note.text} />
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                      >
                        <ClockCircleOutlined style={{ marginRight: 5 }} />
                        {relativeDate(note.date)} ·{" "}
                        {formatNoteTime(note.date, note.time)}
                      </Typography.Text>
                    </Flex>
                    <Flex gap={4}>
                      {note.date !== todayKey() && (
                        <ConfirmActionButton
                          type="text"
                          size="small"
                          ariaLabel="Move to today"
                          hint="Tap again to move this note to today"
                          icon={<CalendarOutlined />}
                          armedIcon={<CalendarFilled />}
                          onConfirm={() => handleMoveToToday(note.id)}
                        />
                      )}
                      <ConfirmActionButton
                        type="text"
                        size="small"
                        ariaLabel="Convert to to-do"
                        hint="Tap again to turn this note into a to-do"
                        icon={<CheckSquareOutlined />}
                        armedIcon={<CheckSquareFilled />}
                        onConfirm={() => handleConvert(note)}
                      />
                      <ConfirmDeleteButton
                        ariaLabel="Delete note"
                        onConfirm={() => handleDelete(note.id)}
                      />
                    </Flex>
                  </Flex>
                </div>
              ))}
            </Flex>
          )}
        </Card>
      </div>

      {notesOpen && (
        <NotesModal
          open
          initialDate={date}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </div>
  );
}
