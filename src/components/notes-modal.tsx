"use client";

import { useState } from "react";
import { App, Button, DatePicker, Flex, Input, Modal, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { todayKey } from "@/models/dailies";
import { addNote } from "@/models/notes";

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
  const [date, setDate] = useState<Dayjs>(() => initialDate ?? dayjs());
  const [text, setText] = useState("");

  const canAdd = text.trim().length > 0;

  function handleClose() {
    setDate(dayjs());
    setText("");
    onClose();
  }

  function handleAdd() {
    if (!user || !canAdd) return;
    addNote(user.uid, {
      text: text.trim(),
      date: date.format("YYYY-MM-DD"),
      time: dayjs().format("HH:mm"),
    }).catch(() => message.error("Could not save note."));
    message.success(
      navigator.onLine ? "Note added" : "Saved offline · will sync",
    );
    setText("");
  }

  return (
    <Modal
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
        Jot down anything — add as many as you like. Everything lands on the
        Notes page.
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
        <Input.TextArea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What's on your mind?"
          autoSize={{ minRows: 3, maxRows: 10 }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              handleAdd();
            }
          }}
        />
        <Button type="primary" disabled={!canAdd} onClick={handleAdd}>
          Add note
        </Button>
      </Flex>
    </Modal>
  );
}
