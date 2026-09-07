"use client";

import { useState } from "react";
import { App, Checkbox, DatePicker, Flex, Modal, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { useDailyDoc } from "@/components/use-day-records";
import { Icon } from "@/components/icon";
import { relativeDate, saveDaily, todayKey } from "@/models/dailies";

export function HabitModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [override, setOverride] = useState<Record<string, boolean>>({});

  const dateKey = date.format("YYYY-MM-DD");

  const entry = useDailyDoc(dateKey, open);

  const bath = override.bath ?? entry?.bath ?? false;
  const brushTeeth = override.brushTeeth ?? entry?.brushTeeth ?? false;

  function changeDate(next: Dayjs) {
    setDate(next);
    setOverride({});
  }

  function handleClose() {
    setDate(dayjs());
    setOverride({});
    onClose();
  }

  function toggle(field: "bath" | "brushTeeth", value: boolean) {
    if (!user) return;
    setOverride((prev) => ({ ...prev, [field]: value }));
    const patch = field === "bath" ? { bath: value } : { brushTeeth: value };
    saveDaily(user.uid, dateKey, patch).catch(() =>
      message.error("Could not save."),
    );
    message.success(navigator.onLine ? "Saved" : "Saved offline · will sync");
  }

  return (
    <Modal
      open={open}
      centered
      title={
        <>
          <Icon name="habits" />
          Habits
        </>
      }
      footer={null}
      onCancel={handleClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Your daily hygiene. Changes save automatically.
      </Typography.Paragraph>

      <Flex vertical gap={14} style={{ marginBottom: 8 }}>
        <DatePicker
          value={date}
          onChange={(value) => value && changeDate(value)}
          format="YYYY-MM-DD"
          allowClear={false}
          inputReadOnly
          maxDate={dayjs(todayKey())}
          style={{ width: "100%" }}
        />

        <Flex vertical gap={6}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            <Icon name="hygiene" />
            Hygiene · {relativeDate(dateKey)}
          </Typography.Text>
          <Flex gap={20} wrap align="center">
            <Checkbox
              checked={bath}
              onChange={(event) => toggle("bath", event.target.checked)}
            >
              Bath
            </Checkbox>
            <Checkbox
              checked={brushTeeth}
              onChange={(event) => toggle("brushTeeth", event.target.checked)}
            >
              Brush
            </Checkbox>
          </Flex>
        </Flex>
      </Flex>
    </Modal>
  );
}
