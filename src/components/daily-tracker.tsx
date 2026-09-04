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
  Tooltip,
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
} from "@/models/dailies";
import {
  EMPTY_IDEALS,
  evaluateIdeal,
  rangeText,
  watchIdeals,
  worstStatus,
  type IdealKey,
  type Ideals,
} from "@/models/ideals";
import { watchWaterPresets, type WaterPreset } from "@/models/presets";
import { WaterPresetsModal } from "@/components/water-presets-modal";
import { IdealBadge } from "@/components/ideal-badge";
import { useSaveStatus } from "@/components/save-status";

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

const BP_TIPS = {
  systolicLow:
    "Below your ideal systolic. To nudge it up: drink more water, add a little salt, eat smaller and more frequent meals, and stand up slowly. See a doctor if you feel faint or dizzy.",
  systolicHigh:
    "Above your ideal systolic. To bring it down: cut back on salt and processed food, move daily (a brisk walk helps), limit alcohol and caffeine, sleep well, and lower stress. See a doctor if it stays high.",
  diastolicLow:
    "Below your ideal diastolic. To raise it: keep fluids up, don't skip meals, ease off alcohol, and rise slowly from sitting or lying down. See a doctor if it comes with fatigue or dizziness.",
  diastolicHigh:
    "Above your ideal diastolic. To lower it: reduce salt, add potassium-rich foods (leafy greens, banana), exercise regularly, cut alcohol, and wind down before bed. See a doctor if it stays high.",
} as const;

const POSTURE_OPTIONS = [
  { label: "Sitting", value: "sitting" },
  { label: "Standing", value: "standing" },
];

const ARM_OPTIONS = [
  { label: "Left arm", value: "left" },
  { label: "Right arm", value: "right" },
];

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

export function DailyTracker() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { state: status, setState: setStatus } = useSaveStatus();
  const [form] = Form.useForm<FormValues>();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [ideals, setIdeals] = useState<Ideals>(EMPTY_IDEALS);
  const [presets, setPresets] = useState<WaterPreset[]>([]);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const watchedWeight = Form.useWatch("weight", form);
  const watchedSystolic = Form.useWatch("systolic", form);
  const watchedDiastolic = Form.useWatch("diastolic", form);
  const watchedWater = Form.useWatch("water", form);

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
    if (!user) return;
    return watchIdeals(user.uid, setIdeals, () => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchWaterPresets(user.uid, setPresets, () => {});
  }, [user]);

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
      return;
    }

    setStatus("saving");
    try {
      await saveDaily(user.uid, values.date.format("YYYY-MM-DD"), input);
      bpDirtyRef.current = false;
      notesDirtyRef.current = false;
      junkFoodDirtyRef.current = false;
      junkDrinkDirtyRef.current = false;
      bathDirtyRef.current = false;
      brushTeethDirtyRef.current = false;
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
    bpDirtyRef.current = false;
    notesDirtyRef.current = false;
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

  function addWater(amount: number) {
    const current = form.getFieldValue("water");
    const next = (typeof current === "number" ? current : 0) + amount;
    form.setFieldsValue({ water: next });

    latestValues.current = form.getFieldsValue() as FormValues;
    markPending();
  }

  function markPending() {
    setStatus("pending");
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

  const systolicEval = evaluateIdeal(
    typeof watchedSystolic === "number" ? watchedSystolic : null,
    ideals.systolic,
  );
  const diastolicEval = evaluateIdeal(
    typeof watchedDiastolic === "number" ? watchedDiastolic : null,
    ideals.diastolic,
  );
  const systolicTip =
    systolicEval === "low"
      ? BP_TIPS.systolicLow
      : systolicEval === "high"
        ? BP_TIPS.systolicHigh
        : undefined;
  const diastolicTip =
    diastolicEval === "low"
      ? BP_TIPS.diastolicLow
      : diastolicEval === "high"
        ? BP_TIPS.diastolicHigh
        : undefined;
  const systolicPlacement = systolicEval === "low" ? "bottom" : "top";
  const diastolicPlacement = diastolicEval === "low" ? "bottom" : "top";

  const weightEval = evaluateIdeal(
    typeof watchedWeight === "number" ? watchedWeight : null,
    ideals.weight,
  );
  const waterEval = evaluateIdeal(
    typeof watchedWater === "number" ? watchedWater : null,
    ideals.water,
  );
  const weightTip =
    weightEval === "high"
      ? `Above your ideal (${rangeText(ideals.weight)} kg)`
      : weightEval === "low"
        ? `Below your ideal (${rangeText(ideals.weight)} kg)`
        : undefined;
  const waterTip =
    waterEval === "high"
      ? `Above your ideal (${rangeText(ideals.water)} ml)`
      : waterEval === "low"
        ? `Below your ideal (${rangeText(ideals.water)} ml)`
        : undefined;
  const weightPlacement = weightEval === "low" ? "bottom" : "top";
  const waterPlacement = waterEval === "low" ? "bottom" : "top";

  function idealStatus(
    value: unknown,
    key: IdealKey,
  ): "error" | undefined {
    const numeric = typeof value === "number" ? value : null;
    const result = evaluateIdeal(numeric, ideals[key]);
    return result === "low" || result === "high" ? "error" : undefined;
  }

  return (
    <>
    <Card
      title={<><Icon name="logEntry" />Log entry</>}
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

        <Form.Item
          label={
            <>
              <Icon name="weight" />
              Weight
              <IdealBadge status={weightEval} />
            </>
          }
        >
          <Tooltip title={weightTip} placement={weightPlacement}>
            <div>
              <Form.Item name="weight" noStyle>
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                  step={0.1}
                  suffix="kg"
                  placeholder="72.5"
                  status={idealStatus(watchedWeight, "weight")}
                />
              </Form.Item>
            </div>
          </Tooltip>
        </Form.Item>

        <Form.Item
          label={
            <>
              <Icon name="bp" />
              Blood pressure
              <IdealBadge status={worstStatus(systolicEval, diastolicEval)} />
            </>
          }
        >
          <Flex vertical gap={10}>
            <Flex gap={8} align="flex-end">
              <Tooltip title={systolicTip} placement={systolicPlacement}>
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
                      status={idealStatus(watchedSystolic, "systolic")}
                    />
                  </Form.Item>
                </div>
              </Tooltip>
              <span style={{ paddingBottom: 6 }}>/</span>
              <Tooltip title={diastolicTip} placement={diastolicPlacement}>
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
                      status={idealStatus(watchedDiastolic, "diastolic")}
                    />
                  </Form.Item>
                </div>
              </Tooltip>
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

        <Form.Item
          label={
            <>
              <Icon name="water" />
              Water
              <IdealBadge status={waterEval} />
            </>
          }
        >
          <Flex vertical gap={8}>
            <Tooltip title={waterTip} placement={waterPlacement}>
              <div>
                <Form.Item name="water" noStyle>
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    step={250}
                    suffix="ml"
                    placeholder="2000"
                    status={idealStatus(watchedWater, "water")}
                  />
                </Form.Item>
              </div>
            </Tooltip>
            <Flex gap={8} wrap align="center">
              {presets.length > 0
                ? presets.map((preset) => (
                    <Button
                      key={preset.id}
                      size="small"
                      onClick={() => addWater(preset.ml)}
                    >
                      {preset.name}
                    </Button>
                  ))
                : WATER_PRESETS.map((amount) => (
                    <Button
                      key={amount}
                      size="small"
                      onClick={() => addWater(amount)}
                    >
                      +{amount}
                    </Button>
                  ))}
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: "auto", marginLeft: "auto" }}
                icon={<Icon name="presets" style={{ marginRight: -4 }} />}
                onClick={() => setPresetsOpen(true)}
              >
                Presets
              </Button>
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
    <WaterPresetsModal
      open={presetsOpen}
      onClose={() => setPresetsOpen(false)}
      presets={presets}
    />
    </>
  );
}

