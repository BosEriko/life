"use client";


import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Spin,
  theme,
  Typography,
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
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Icon } from "@/components/icon";
import { NotesModal } from "@/components/notes-modal";
import { relativeDate, todayKey } from "@/models/dailies";
import {
  deleteNote,
  formatNoteTime,
  moveNoteToDate,
  sortNotes,
  watchNotes,
  type Note,
} from "@/models/notes";
import { PageHeading } from "@/components/page-heading";
import { journalViewUrl, noteDateFromQuery } from "@/lib/journal-views";
import { RichTextView } from "@/components/rich-text-view";
import { plainTextToHtml } from "@/components/rich-text-editor";
import { ACTIVE_TODO_DATE, todoValidation, type Todo } from "@/lib/todos";
import { convertNoteToTodo } from "@/models/todos";
import { JournalSkeleton } from "@/components/journal-skeleton";

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
        <Card styles={{ body: { padding: 20 } }} style={{ boxShadow: token.boxShadowTertiary }}>
          <Typography.Text style={{ display: "block", fontSize: 17, marginBottom: 12 }}>
            Dates with notes
          </Typography.Text>
          <Flex vertical gap={4}>
          {!loaded ? (
            <Flex justify="center" style={{ padding: 24 }}>
              <Spin size="small" />
            </Flex>
          ) : datesWithNotes.length === 0 ? (
            <Typography.Text type="secondary">No notes yet.</Typography.Text>
          ) : (
            datesWithNotes.map(({ key, count }) => {
              const selected = key === selectedDateKey;
              return (
                <Button
                  key={key}
                  type="text"
                  aria-current={selected ? "date" : undefined}
                  onClick={() => setDate(dayjs(key))}
                  style={{
                    height: 42,
                    paddingInline: 12,
                    fontWeight: selected ? 700 : 400,
                    background: selected ? token.colorPrimaryBg : undefined,
                  }}
                >
                  <Flex align="center" justify="space-between" style={{ width: "100%" }}>
                    <span>{dayjs(key).format("MMMM D, YYYY")}</span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        color: selected ? token.colorPrimary : token.colorTextSecondary,
                        background: selected
                          ? token.colorBgContainer
                          : token.colorFillSecondary,
                        fontSize: 12,
                      }}
                    >
                      {count}
                    </span>
                  </Flex>
                </Button>
              );
            })
          )}
          </Flex>
        </Card>

        <Card
          styles={{ body: { padding: 20 } }}
          style={{ minWidth: 0, boxShadow: token.boxShadowTertiary }}
        >
          <Typography.Text style={{ display: "block", fontSize: 17, marginBottom: 12 }}>
            {date.format("dddd, MMMM D, YYYY")}
          </Typography.Text>
          <Flex align="center" gap={8} wrap style={{ marginBottom: 20 }}>
            <Button
              aria-label="Previous day"
              icon={<LeftOutlined />}
              onClick={() => changeDay(-1)}
            />
            <DatePicker
              value={date}
              onChange={(next) => next && setDate(next)}
              format="YYYY-MM-DD"
              maxDate={dayjs(todayKey())}
              allowClear={false}
              style={{ minWidth: 160 }}
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
