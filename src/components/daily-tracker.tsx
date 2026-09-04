"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Segmented,
  Typography,
} from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Icon } from "@/components/icon";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import {
  formatBpTime,
  saveDaily,
  todayKey,
  watchDailies,
  type BpArm,
  type BpPosture,
  type DailyEntry,
  type DailyInput,
} from "@/lib/dailies";

const SAVE_DELAY_MS = 2000;

type FormValues = {
  date: Dayjs;
  weight?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  bpPosture?: BpPosture;
  bpArm?: BpArm;
  water?: number | null;
  notes?: string | null;
  junkFood?: boolean;
  junkDrink?: boolean;
  bath?: boolean;
  brushTeeth?: boolean;
};

const WATER_PRESETS = [500, 1000, 1500, 2000];

const POSTURE_OPTIONS = [
  { label: "Sitting", value: "sitting" },
  { label: "Standing", value: "standing" },
];

const ARM_OPTIONS = [
  { label: "Left arm", value: "left" },
  { label: "Right arm", value: "right" },
];

type SaveStatus = "idle" | "pending" | "saving";

type CollectOptions = {
  stampBpTime: boolean;
  includeNotes: boolean;
  includeJunkFood: boolean;
  includeJunkDrink: boolean;
  includeBath: boolean;
  includeBrushTeeth: boolean;
};

function collectInput(values: FormValues, opts: CollectOptions): DailyInput {
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
    if (values.bpPosture) input.bpPosture = values.bpPosture;
    if (values.bpArm) input.bpArm = values.bpArm;
    if (opts.stampBpTime) input.bpTime = dayjs().format("HH:mm");
  }
  if (typeof values.water === "number" && values.water > 0) {
    input.water = values.water;
  }
  if (opts.includeNotes && typeof values.notes === "string") {
    input.notes = values.notes.trim();
  }
  if (opts.includeJunkFood) input.junkFood = values.junkFood === true;
  if (opts.includeJunkDrink) input.junkDrink = values.junkDrink === true;
  if (opts.includeBath) input.bath = values.bath === true;
  if (opts.includeBrushTeeth) input.brushTeeth = values.brushTeeth === true;
  return input;
}

const SAVE_MSG_KEY = "daily-save";

export function DailyTracker() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const timerRef = useRef<number | null>(null);
  const latestValues = useRef<FormValues | null>(null);
  const bpDirtyRef = useRef(false);
  const notesDirtyRef = useRef(false);
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
    if (status === "pending" || status === "saving") return;
    const entry = entries.find((item) => item.date === selectedDate);
    form.setFieldsValue({
      weight: entry?.weight ?? null,
      systolic: entry?.systolic ?? null,
      diastolic: entry?.diastolic ?? null,
      bpPosture: entry?.bpPosture ?? "sitting",
      bpArm: entry?.bpArm ?? "left",
      water: entry?.water ?? null,
      notes: entry?.notes ?? "",
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

    const input = collectInput(values, {
      stampBpTime: bpDirtyRef.current,
      includeNotes: notesDirtyRef.current,
      includeJunkFood: junkFoodDirtyRef.current,
      includeJunkDrink: junkDrinkDirtyRef.current,
      includeBath: bathDirtyRef.current,
      includeBrushTeeth: brushTeethDirtyRef.current,
    });
    if (Object.keys(input).length === 0) {
      setStatus("idle");
      message.destroy(SAVE_MSG_KEY);
      return;
    }

    setStatus("saving");
    message.open({
      key: SAVE_MSG_KEY,
      type: "loading",
      content: "Saving…",
      duration: 0,
    });
    try {
      await saveDaily(user.uid, values.date.format("YYYY-MM-DD"), input);
      bpDirtyRef.current = false;
      notesDirtyRef.current = false;
      junkFoodDirtyRef.current = false;
      junkDrinkDirtyRef.current = false;
      bathDirtyRef.current = false;
      brushTeethDirtyRef.current = false;
      setStatus("idle");
      message.open({
        key: SAVE_MSG_KEY,
        type: "success",
        content: "Saved",
        duration: 2,
      });
    } catch {
      setStatus("idle");
      message.open({
        key: SAVE_MSG_KEY,
        type: "error",
        content: "Could not save. Try again.",
        duration: 3,
      });
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

  function applyDate(next: Dayjs) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    bpDirtyRef.current = false;
    notesDirtyRef.current = false;
    junkFoodDirtyRef.current = false;
    junkDrinkDirtyRef.current = false;
    bathDirtyRef.current = false;
    brushTeethDirtyRef.current = false;
    message.destroy(SAVE_MSG_KEY);
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

  function addWater(amount: number) {
    const current = form.getFieldValue("water");
    const next = (typeof current === "number" ? current : 0) + amount;
    form.setFieldsValue({ water: next });

    latestValues.current = form.getFieldsValue() as FormValues;
    markPending();
  }

  function markPending() {
    setStatus("pending");
    message.open({
      key: SAVE_MSG_KEY,
      type: "warning",
      content: "Unsaved changes",
      duration: 0,
    });
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flush();
    }, SAVE_DELAY_MS);
  }

  function handleValuesChange(
    changed: Partial<FormValues>,
    all: FormValues,
  ) {
    latestValues.current = all;

    if (changed.date !== undefined) {
      applyDate(all.date);
      return;
    }

    if (changed.systolic !== undefined || changed.diastolic !== undefined) {
      bpDirtyRef.current = true;
    }
    if (changed.notes !== undefined) {
      notesDirtyRef.current = true;
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

  const currentEntry = entries.find((item) => item.date === selectedDate);

  return (
    <Card title={<><Icon name="logEntry" />Log entry</>}>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          date: dayjs(),
          bpPosture: "sitting",
          bpArm: "left",
          notes: "",
          junkFood: false,
          junkDrink: false,
          bath: false,
          brushTeeth: false,
        }}
        onValuesChange={handleValuesChange}
      >
        <Form.Item label={<><Icon name="date" />Date</>}>
          <Flex align="center" gap={8}>
            <Button
              icon={<LeftOutlined />}
              onClick={() => stepDay(-1)}
              aria-label="Previous day"
            />
            <Form.Item name="date" noStyle>
              <DatePicker
                style={{ flex: 1 }}
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
            <Button
              onClick={goToToday}
              disabled={selectedDate === todayKey()}
            >
              Today
            </Button>
          </Flex>
        </Form.Item>

        <Form.Item label={<><Icon name="weight" />Weight</>} name="weight">
          <InputNumber
            style={{ width: "100%" }}
            min={1}
            step={0.1}
            suffix="kg"
            placeholder="72.5"
          />
        </Form.Item>

        <Form.Item label={<><Icon name="bp" />Blood pressure</>}>
          <Flex vertical gap={10}>
            <Flex gap={8} align="flex-end">
              <div style={{ flex: 1 }}>
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 12, display: "block", marginBottom: 2 }}
                >
                  Systolic
                </Typography.Text>
                <Form.Item name="systolic" noStyle>
                  <InputNumber
                    style={{ width: "100%" }}
                    min={1}
                    precision={0}
                    placeholder="120"
                  />
                </Form.Item>
              </div>
              <span style={{ paddingBottom: 6 }}>/</span>
              <div style={{ flex: 1 }}>
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 12, display: "block", marginBottom: 2 }}
                >
                  Diastolic
                </Typography.Text>
                <Form.Item name="diastolic" noStyle>
                  <InputNumber
                    style={{ width: "100%" }}
                    min={1}
                    precision={0}
                    placeholder="80"
                  />
                </Form.Item>
              </div>
              <Typography.Text type="secondary" style={{ paddingBottom: 6 }}>
                mmHg
              </Typography.Text>
            </Flex>
            <Flex gap={8} wrap>
              <Form.Item name="bpPosture" noStyle>
                <Segmented size="small" options={POSTURE_OPTIONS} />
              </Form.Item>
              <Form.Item name="bpArm" noStyle>
                <Segmented size="small" options={ARM_OPTIONS} />
              </Form.Item>
            </Flex>
            {currentEntry?.bpTime ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Recorded at{" "}
                {formatBpTime(selectedDate, currentEntry.bpTime)}
              </Typography.Text>
            ) : null}
          </Flex>
        </Form.Item>

        <Form.Item label={<><Icon name="water" />Water</>}>
          <Flex vertical gap={8}>
            <Form.Item name="water" noStyle>
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                step={250}
                suffix="ml"
                placeholder="2000"
              />
            </Form.Item>
            <Flex gap={8} wrap>
              {WATER_PRESETS.map((amount) => (
                <Button
                  key={amount}
                  size="small"
                  onClick={() => addWater(amount)}
                >
                  +{amount}
                </Button>
              ))}
            </Flex>
          </Flex>
        </Form.Item>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            columnGap: 16,
          }}
        >
          <Form.Item label={<><Icon name="hygiene" />Hygiene</>}>
            <Flex gap={16} wrap>
              <Form.Item name="bath" valuePropName="checked" noStyle>
                <Checkbox>Bath</Checkbox>
              </Form.Item>
              <Form.Item name="brushTeeth" valuePropName="checked" noStyle>
                <Checkbox>Brush</Checkbox>
              </Form.Item>
            </Flex>
          </Form.Item>

          <Form.Item label={<><Icon name="junkFood" />Junk</>}>
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

        <Form.Item label={<><Icon name="notes" />Notes</>} name="notes">
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 6 }}
            placeholder="Anything worth noting about today…"
          />
        </Form.Item>
      </Form>
    </Card>
  );
}

