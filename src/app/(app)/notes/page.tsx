"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Empty,
  Flex,
  Popconfirm,
  Spin,
  theme,
  Typography,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
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
  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState<Dayjs | null>(null);

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

  const shown = useMemo(() => {
    const all = sortNotes(notes);
    if (!date) return all;
    const key = date.format("YYYY-MM-DD");
    return all.filter((note) => note.date === key);
  }, [notes, date]);

  return (
    <div style={{ maxWidth: 640 }}>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
        Notes
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Everything you&apos;ve jotted down. Add new ones from the pencil button.
      </Typography.Paragraph>

      <Flex align="center" gap={10} wrap style={{ marginBottom: 20 }}>
        <DatePicker
          value={date}
          onChange={setDate}
          format="YYYY-MM-DD"
          maxDate={dayjs(todayKey())}
          placeholder="Filter by day"
          style={{ minWidth: 180 }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {shown.length} {shown.length === 1 ? "note" : "notes"}
          {date ? "" : " total"}
        </Typography.Text>
      </Flex>

      {!loaded ? (
        <Flex justify="center" style={{ padding: 24 }}>
          <Spin />
        </Flex>
      ) : shown.length === 0 ? (
        <Empty
          description={date ? "No notes on this day." : "No notes yet."}
        />
      ) : (
        <Flex vertical>
          {shown.map((note) => (
            <Flex
              key={note.id}
              align="flex-start"
              justify="space-between"
              gap={12}
              style={{
                padding: "14px 0",
                borderTop: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Flex vertical gap={4}>
                <Typography.Text style={{ whiteSpace: "pre-wrap" }}>
                  {note.text}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {relativeDate(note.date)} ·{" "}
                  {formatNoteTime(note.date, note.time)}
                </Typography.Text>
              </Flex>
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
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Flex>
          ))}
        </Flex>
      )}
    </div>
  );
}
