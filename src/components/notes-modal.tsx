"use client";

import { AppModal } from "@/components/app-modal";

import { useState, useSyncExternalStore } from "react";
import {
  App,
  Button,
  DatePicker,
  Flex,
  Grid,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { RichTextEditor } from "@/components/rich-text-editor";
import { todayKey } from "@/models/dailies";
import { addNote } from "@/models/notes";

const noSubscribe = () => () => {};
const detectMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function NotesModal({
  open,
  onClose,
  initialDate,
}: {
  open: boolean;
  onClose: () => void;
  initialDate?: Dayjs;
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const enterToSave = screens.md === true;
  const [date, setDate] = useState<Dayjs>(() => initialDate ?? dayjs());
  const isMac = useSyncExternalStore(noSubscribe, detectMac, () => false);
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  const canAdd = text.trim().length > 0;

  function handleClose() {
    setDate(dayjs());
    setText("");
    setHtml("");
    setEditorKey((key) => key + 1);
    onClose();
  }

  function handleAdd() {
    if (!user || !canAdd) return;
    addNote(user.uid, {
      text: text.trim(),
      html,
      date: date.format("YYYY-MM-DD"),
      time: dayjs().format("HH:mm"),
    }).catch(() => message.error("Could not save note."));
    message.success(
      navigator.onLine ? "Note added" : "Saved offline · will sync",
    );
    handleClose();
  }

  return (
    <AppModal
      open={open}
      centered
      title={
        <>
          <Icon name="logEntry" />
          Notes
        </>
      }
      footer={null}
      onCancel={handleClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Jot down anything. Everything lands in your Journal.
      </Typography.Paragraph>

      <Flex vertical gap={10}>
        <DatePicker
          value={date}
          onChange={(value) => value && setDate(value)}
          format="YYYY-MM-DD"
          allowClear={false}
          inputReadOnly
          maxDate={dayjs(todayKey())}
          style={{ width: "100%" }}
        />
        {open && (
          <RichTextEditor
            key={editorKey}
            initialHtml=""
            ariaLabel="Note"
            placeholder="What's on your mind?"
            autoFocus
            onChange={(nextHtml, nextText) => {
              setHtml(nextHtml);
              setText(nextText);
            }}
            onSubmit={enterToSave ? handleAdd : undefined}
          />
        )}
        {enterToSave ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {isMac ? "⌘ + Enter to save" : "Ctrl + Enter to save"}
          </Typography.Text>
        ) : null}
        <Button type="primary" disabled={!canAdd} onClick={handleAdd}>
          Add note
        </Button>
      </Flex>
    </AppModal>
  );
}
