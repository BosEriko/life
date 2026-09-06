"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App, Button, Card, Checkbox, DatePicker, Flex, Form, Grid } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Icon } from "@/components/icon";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import {
  saveDaily,
  todayKey,
  watchDailies,
  type DailyEntry,
  type DailyInput,
} from "@/models/dailies";
import { useSaveStatus } from "@/components/save-status";
import { SavePill } from "@/components/save-pill";

const SAVE_DELAY_MS = 2000;

type FormValues = {
  date: Dayjs;
  junkFood?: boolean;
  junkDrink?: boolean;
  bath?: boolean;
  brushTeeth?: boolean;
};

type CollectOptions = {
  includeJunkFood: boolean;
  includeJunkDrink: boolean;
  includeBath: boolean;
  includeBrushTeeth: boolean;
};

function collectInput(values: FormValues, opts: CollectOptions): DailyInput {
  const input: DailyInput = {};
  if (opts.includeJunkFood) input.junkFood = values.junkFood === true;
  if (opts.includeJunkDrink) input.junkDrink = values.junkDrink === true;
  if (opts.includeBath) input.bath = values.bath === true;
  if (opts.includeBrushTeeth) input.brushTeeth = values.brushTeeth === true;
  return input;
}

export function DailyTracker() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { state: status, setState: setStatus } = useSaveStatus();
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm<FormValues>();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const timerRef = useRef<number | null>(null);
  const latestValues = useRef<FormValues | null>(null);
  const junkFoodDirtyRef = useRef(false);
  const junkDrinkDirtyRef = useRef(false);
  const bathDirtyRef = useRef(false);
  const brushTeethDirtyRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    return watchDailies(
      user.uid,
      (next) => {
        setEntries(next);
      },
      () => {
        message.error("Could not load your entries.");
      },
    );
  }, [user, message]);

  useEffect(() => {
    if (status === "pending" || status === "saving" || status === "offline") {
      return;
    }
    if (
      junkFoodDirtyRef.current ||
      junkDrinkDirtyRef.current ||
      bathDirtyRef.current ||
      brushTeethDirtyRef.current
    ) {
      return;
    }
    const entry = entries.find((item) => item.date === selectedDate);
    form.setFieldsValue({
      junkFood: entry?.junkFood ?? false,
      junkDrink: entry?.junkDrink ?? false,
      bath: entry?.bath ?? false,
      brushTeeth: entry?.brushTeeth ?? false,
    });
  }, [entries, selectedDate, status, form]);

  const flush = useCallback(async () => {
    timerRef.current = null;
    const values = latestValues.current;
    if (!user || !values) return;

    const dirty = {
      includeJunkFood: junkFoodDirtyRef.current,
      includeJunkDrink: junkDrinkDirtyRef.current,
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
      if (dirty.includeJunkFood) junkFoodDirtyRef.current = false;
      if (dirty.includeJunkDrink) junkDrinkDirtyRef.current = false;
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
    junkFoodDirtyRef.current = false;
    junkDrinkDirtyRef.current = false;
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

    if (changed.junkFood !== undefined) {
      junkFoodDirtyRef.current = true;
    }
    if (changed.junkDrink !== undefined) {
      junkDrinkDirtyRef.current = true;
    }
    if (changed.bath !== undefined) {
      bathDirtyRef.current = true;
    }
    if (changed.brushTeeth !== undefined) {
      brushTeethDirtyRef.current = true;
    }

    markPending();
  }

  return (
    <Card
      title={
        <>
          <Icon name="logEntry" />
          Log entry
        </>
      }
      extra={<SavePill />}
      style={{
        boxShadow:
          "0 12px 32px -6px rgba(20, 40, 30, 0.10), 0 3px 10px -2px rgba(20, 40, 30, 0.05)",
      }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          date: dayjs(),
          junkFood: false,
          junkDrink: false,
          bath: false,
          brushTeeth: false,
        }}
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: screens.md ? "1fr 1fr" : "1fr",
            columnGap: 16,
          }}
        >
          <Form.Item
            label={
              <>
                <Icon name="hygiene" />
                Hygiene
              </>
            }
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

          <Form.Item
            label={
              <>
                <Icon name="junkFood" />
                Junk
              </>
            }
          >
            <Flex gap={16} wrap>
              <Form.Item name="junkFood" valuePropName="checked" noStyle>
                <Checkbox>Food</Checkbox>
              </Form.Item>
              <Form.Item name="junkDrink" valuePropName="checked" noStyle>
                <Checkbox>Drink</Checkbox>
              </Form.Item>
            </Flex>
          </Form.Item>
        </div>
      </Form>
    </Card>
  );
}
