"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  App,
  Card,
  DatePicker,
  Empty,
  Flex,
  Form,
  InputNumber,
  List,
  Spin,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import {
  saveDaily,
  todayKey,
  watchDailies,
  type DailyEntry,
  type DailyInput,
} from "@/lib/dailies";

const SAVE_DELAY_MS = 5000;

type FormValues = {
  date: Dayjs;
  weight?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
};

type SaveStatus = "idle" | "pending" | "saving" | "saved";

function relativeDate(key: string): string {
  const diffDays = dayjs(todayKey()).diff(dayjs(key), "day");
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return dayjs(key).format("dddd");
  return dayjs(key).format("MMM D");
}

function collectInput(values: FormValues): DailyInput {
  const input: DailyInput = {};
  if (typeof values.weight === "number" && values.weight > 0) {
    input.weight = values.weight;
  }
  if (
    typeof values.systolic === "number" &&
    typeof values.diastolic === "number" &&
    values.systolic > 0 &&
    values.diastolic > 0
  ) {
    input.systolic = values.systolic;
    input.diastolic = values.diastolic;
  }
  return input;
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "",
  pending: "Unsaved changes…",
  saving: "Saving…",
  saved: "Saved",
};

export function DailyTracker() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const timerRef = useRef<number | null>(null);
  const latestValues = useRef<FormValues | null>(null);

  useEffect(() => {
    if (!user) return;
    return watchDailies(
      user.uid,
      (next) => {
        setEntries(next);
        setLoaded(true);
      },
      () => {
        message.error("Could not load your entries.");
        setLoaded(true);
      },
    );
  }, [user, message]);

  useEffect(() => {
    if (status === "pending" || status === "saving") return;
    const entry = entries.find((item) => item.date === selectedDate);
    form.setFieldsValue({
      weight: entry?.weight ?? null,
      systolic: entry?.systolic ?? null,
      diastolic: entry?.diastolic ?? null,
    });
  }, [entries, selectedDate, status, form]);

  const flush = useCallback(async () => {
    timerRef.current = null;
    const values = latestValues.current;
    if (!user || !values) return;

    const input = collectInput(values);
    if (Object.keys(input).length === 0) {
      setStatus("idle");
      return;
    }

    setStatus("saving");
    try {
      await saveDaily(user.uid, values.date.format("YYYY-MM-DD"), input);
      setStatus("saved");
    } catch {
      message.error("Could not save. Try again.");
      setStatus("idle");
    }
  }, [user, message]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        void flush();
      }
    };
  }, [flush]);

  function handleValuesChange(
    changed: Partial<FormValues>,
    all: FormValues,
  ) {
    latestValues.current = all;

    if (changed.date !== undefined) {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      setStatus("idle");
      setSelectedDate(all.date.format("YYYY-MM-DD"));
      return;
    }

    setStatus("pending");
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flush();
    }, SAVE_DELAY_MS);
  }

  return (
    <Flex vertical gap={24}>
      <Card title="Log entry">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ date: dayjs() }}
          onValuesChange={handleValuesChange}
        >
          <Form.Item label="Date" name="date">
            <DatePicker
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
              maxDate={dayjs()}
              allowClear={false}
            />
          </Form.Item>

          <Form.Item label="Weight" name="weight">
            <InputNumber
              style={{ width: "100%" }}
              min={1}
              step={0.1}
              addonAfter="kg"
              placeholder="72.5"
            />
          </Form.Item>

          <Form.Item label="Blood pressure">
            <Flex gap={8} align="center">
              <Form.Item name="systolic" noStyle>
                <InputNumber
                  style={{ flex: 1 }}
                  min={1}
                  precision={0}
                  placeholder="120"
                />
              </Form.Item>
              <span>/</span>
              <Form.Item name="diastolic" noStyle>
                <InputNumber
                  style={{ flex: 1 }}
                  min={1}
                  precision={0}
                  placeholder="80"
                />
              </Form.Item>
              <Typography.Text type="secondary">mmHg</Typography.Text>
            </Flex>
          </Form.Item>

          <div style={{ minHeight: 22 }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {STATUS_LABEL[status]}
            </Typography.Text>
          </div>
        </Form>
      </Card>

      <div>
        <Typography.Title level={5}>Recent</Typography.Title>
        {!loaded ? (
          <Flex justify="center" style={{ padding: 24 }}>
            <Spin />
          </Flex>
        ) : entries.length === 0 ? (
          <Empty description="No entries yet." />
        ) : (
          <List
            bordered
            dataSource={entries}
            renderItem={(entry) => (
              <List.Item>
                <Typography.Text strong>
                  {relativeDate(entry.date)}
                </Typography.Text>
                <Flex gap={16}>
                  {entry.weight != null ? (
                    <Typography.Text type="secondary">
                      <Typography.Text strong>{entry.weight}</Typography.Text> kg
                    </Typography.Text>
                  ) : null}
                  {entry.systolic != null && entry.diastolic != null ? (
                    <Typography.Text type="secondary">
                      <Typography.Text strong>
                        {entry.systolic}/{entry.diastolic}
                      </Typography.Text>{" "}
                      mmHg
                    </Typography.Text>
                  ) : null}
                </Flex>
              </List.Item>
            )}
          />
        )}
      </div>
    </Flex>
  );
}
