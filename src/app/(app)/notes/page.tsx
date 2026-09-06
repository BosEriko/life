"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Modal,
  Popconfirm,
  Spin,
  theme,
  Typography,
} from "antd";
import {
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { relativeDate, todayKey } from "@/models/dailies";
import {
  deleteNote,
  formatNoteTime,
  sortNotes,
  watchNotes,
  type Note,
} from "@/models/notes";

export default function NotesPage() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState<Dayjs>(() => dayjs(todayKey()));
  const [noteToShare, setNoteToShare] = useState<Note | null>(null);
  const [copying, setCopying] = useState(false);

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

  function sharedNoteText(note: Note) {
    const dateLabel = dayjs(note.date).format("MMMM D, YYYY");
    return `${note.text}\n\n${dateLabel} at ${formatNoteTime(note.date, note.time)}`;
  }

  async function copySharedNote() {
    if (!noteToShare) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(sharedNoteText(noteToShare));
      setNoteToShare(null);
      message.success("Note copied");
    } catch {
      message.error("Could not copy note.");
    } finally {
      setCopying(false);
    }
  }

  const sortedNotes = useMemo(() => sortNotes(notes), [notes]);
  const datesWithNotes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of sortedNotes) {
      counts.set(note.date, (counts.get(note.date) ?? 0) + 1);
    }
    return Array.from(counts, ([key, count]) => ({ key, count }));
  }, [sortedNotes]);
  const selectedDateKey = date.format("YYYY-MM-DD");
  const shown = useMemo(
    () => sortedNotes.filter((note) => note.date === selectedDateKey),
    [sortedNotes, selectedDateKey],
  );

  function changeDay(amount: number) {
    setDate((current) => current.add(amount, "day"));
  }

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
        <Icon name="logEntry" />
        Notes
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Everything you&apos;ve jotted down. Add new ones from the pencil button.
      </Typography.Paragraph>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: screens.md
            ? "minmax(220px, 280px) minmax(0, 1fr)"
            : "minmax(0, 1fr)",
          gap: 32,
          alignItems: "start",
        }}
      >
        <Flex vertical gap={8}>
          <Typography.Text strong>
            <Icon name="date" />
            Dates with notes
          </Typography.Text>
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
                  type={selected ? "primary" : "text"}
                  onClick={() => setDate(dayjs(key))}
                  style={{ height: 42, paddingInline: 12 }}
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

        <div style={{ minWidth: 0 }}>
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
              disabled={date.isSame(dayjs(todayKey()), "day")}
              onClick={() => changeDay(1)}
            />
            <Button
              icon={
                <Icon
                  name="date"
                  style={{ marginRight: 0, opacity: 1 }}
                />
              }
              disabled={date.isSame(dayjs(todayKey()), "day")}
              onClick={() => setDate(dayjs(todayKey()))}
            >
              Today
            </Button>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {shown.length} {shown.length === 1 ? "note" : "notes"}
            </Typography.Text>
          </Flex>

          <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 12 }}>
            {date.format("MMMM D, YYYY")}
          </Typography.Title>

          {!loaded ? (
            <Flex justify="center" style={{ padding: 24 }}>
              <Spin />
            </Flex>
          ) : shown.length === 0 ? (
            <Empty description="No notes on this day." />
          ) : (
            <Flex vertical gap={12}>
              {shown.map((note) => (
                <Card key={note.id} size="small">
                  <Flex
                    align="flex-start"
                    justify="space-between"
                    gap={12}
                  >
                    <Flex vertical gap={4}>
                      <Typography.Text style={{ whiteSpace: "pre-wrap" }}>
                        {note.text}
                      </Typography.Text>
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
                      <Button
                        type="text"
                        size="small"
                        aria-label="Share note"
                        icon={<SendOutlined />}
                        onClick={() => setNoteToShare(note)}
                      />
                      <Popconfirm
                        title="Delete this note?"
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(note.id)}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          aria-label="Delete note"
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}
        </div>
      </div>

      <Modal
        open={noteToShare !== null}
        centered
        title={
          <>
            <SendOutlined style={{ marginRight: 8 }} />
            Share note
          </>
        }
        okText="Copy note"
        okButtonProps={{ icon: <CopyOutlined /> }}
        confirmLoading={copying}
        onOk={copySharedNote}
        onCancel={() => setNoteToShare(null)}
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Copy this note, then paste it into the conversation or app where you
          want to share it.
        </Typography.Paragraph>
        {noteToShare && (
          <Card size="small">
            <Typography.Paragraph
              style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}
            >
              {noteToShare.text}
            </Typography.Paragraph>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 5 }} />
              {dayjs(noteToShare.date).format("MMMM D, YYYY")} ·{" "}
              {formatNoteTime(noteToShare.date, noteToShare.time)}
            </Typography.Text>
          </Card>
        )}
      </Modal>
    </div>
  );
}
