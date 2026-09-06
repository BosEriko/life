"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Checkbox, DatePicker, Flex, Form, Modal } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Icon } from "@/components/icon";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import {
  saveDaily,
  todayKey,
  type DailyEntry,
  type DailyInput,
} from "@/models/dailies";
import { useSaveStatus } from "@/components/save-status";
import { SavePill } from "@/components/save-pill";

const SAVE_DELAY_MS = 2000;

type FormValues = {
  date: Dayjs;
  bath?: boolean;
  brushTeeth?: boolean;
};

type CollectOptions = {
  includeBath: boolean;
  includeBrushTeeth: boolean;
};

function collectInput(values: FormValues, opts: CollectOptions): DailyInput {
  const input: DailyInput = {};
  if (opts.includeBath) input.bath = values.bath === true;
  if (opts.includeBrushTeeth) input.brushTeeth = values.brushTeeth === true;
  return input;
}

export function HabitModal({
  open,
  onClose,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  entries: DailyEntry[];
}) {
  const { user } = useAuth();
  const { state: status, setState: setStatus } = useSaveStatus();
  const [form] = Form.useForm<FormValues>();
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const timerRef = useRef<number | null>(null);
  const latestValues = useRef<FormValues | null>(null);
  const bathDirtyRef = useRef(false);
  const brushTeethDirtyRef = useRef(false);

  useEffect(() => {
    if (status === "pending" || status === "saving" || status === "offline") {
      return;
    }
    if (bathDirtyRef.current || brushTeethDirtyRef.current) return;
    const entry = entries.find((item) => item.date === selectedDate);
    form.setFieldsValue({
      bath: entry?.bath ?? false,
      brushTeeth: entry?.brushTeeth ?? false,
    });
  }, [entries, selectedDate, status, form]);

  const flush = useCallback(async () => {
    timerRef.current = null;
    const values = latestValues.current;
    if (!user || !values) return;

    const dirty = {
      includeBath: bathDirtyRef.current,
      includeBrushTeeth: brushTeethDirtyRef.current,
    };
    const input = collectInput(values, dirty);
    if (Object.keys(input).length === 0) {
      setStatus("idle");
      return;
    }

    const dateKey = values.date.format("YYYY-MM-DD");
    setStatus(navigator.onLine ? "saving" : "offline");

    try {
      await saveDaily(user.uid, dateKey, input);
      if (dirty.includeBath) bathDirtyRef.current = false;
      if (dirty.includeBrushTeeth) brushTeethDirtyRef.current = false;
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [user, setStatus]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        void flush();
      }
    };
  }, [flush]);

  function applyDate(next: Dayjs) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    bathDirtyRef.current = false;
    brushTeethDirtyRef.current = false;
    setStatus("idle");
    setSelectedDate(next.format("YYYY-MM-DD"));
  }

  function stepDay(amount: number) {
    const next = dayjs(selectedDate).add(amount, "day");
    form.setFieldValue("date", next);
    applyDate(next);
  }

  function goToToday() {
    const today = dayjs(todayKey());
    form.setFieldValue("date", today);
    applyDate(today);
  }

  function markPending() {
    setStatus("pending");
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flush();
    }, SAVE_DELAY_MS);
  }

  function handleValuesChange(changed: Partial<FormValues>, all: FormValues) {
    latestValues.current = all;

    if (changed.date !== undefined) {
      applyDate(all.date);
      return;
    }

    if (changed.bath !== undefined) bathDirtyRef.current = true;
    if (changed.brushTeeth !== undefined) brushTeethDirtyRef.current = true;

    markPending();
  }

  function handleClose() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      void flush();
    }
    applyDate(dayjs());
    form.setFieldValue("date", dayjs());
    onClose();
  }

  return (
    <Modal
      open={open}
      centered
      forceRender
      title={
        <>
          <Icon name="habits" />
          Habits
        </>
      }
      footer={null}
      onCancel={handleClose}
    >
      <Flex justify="flex-end" style={{ marginBottom: 12 }}>
        <SavePill />
      </Flex>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ date: dayjs(), bath: false, brushTeeth: false }}
        onValuesChange={handleValuesChange}
      >
        <Form.Item
          label={
            <>
              <Icon name="date" />
              Date
            </>
          }
        >
          <Flex align="center" gap={8} wrap>
            <Button
              icon={<LeftOutlined />}
              onClick={() => stepDay(-1)}
              aria-label="Previous day"
            />
            <Form.Item name="date" noStyle>
              <DatePicker
                style={{ flex: 1, minWidth: 132 }}
                format="YYYY-MM-DD"
                allowClear={false}
                inputReadOnly
                maxDate={dayjs(todayKey())}
              />
            </Form.Item>
            <Button
              icon={<RightOutlined />}
              onClick={() => stepDay(1)}
              aria-label="Next day"
            />
            <Button onClick={goToToday} disabled={selectedDate === todayKey()}>
              Today
            </Button>
          </Flex>
        </Form.Item>

        <Form.Item
          label={
            <>
              <Icon name="hygiene" />
              Hygiene
            </>
          }
          style={{ marginBottom: 0 }}
        >
          <Flex gap={16} wrap>
            <Form.Item name="bath" valuePropName="checked" noStyle>
              <Checkbox>Bath</Checkbox>
            </Form.Item>
            <Form.Item name="brushTeeth" valuePropName="checked" noStyle>
              <Checkbox>Brush</Checkbox>
            </Form.Item>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  );
}
