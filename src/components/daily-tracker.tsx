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
  Grid,
  InputNumber,
} from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Icon } from "@/components/icon";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import {
  todayKey,
  watchDailies,
  type DailyEntry,
  type DailyInput,
} from "@/models/dailies";
import { getQueuedDailyInput, queueDailySave } from "@/lib/daily-sync";
import {
  EMPTY_IDEALS,
  evaluateIdeal,
  rangeText,
  watchIdeals,
  type IdealKey,
  type Ideals,
} from "@/models/ideals";
import { watchWaterPresets, type WaterPreset } from "@/models/presets";
import { WaterPresetsModal } from "@/components/water-presets-modal";
import { IdealBadge } from "@/components/ideal-badge";
import { useSaveStatus } from "@/components/save-status";
import { SavePill } from "@/components/save-pill";
import { Tip } from "@/components/tip";

const SAVE_DELAY_MS = 2000;

type FormValues = {
  date: Dayjs;
  weight?: number | null;
  water?: number | null;
  junkFood?: boolean;
  junkDrink?: boolean;
  bath?: boolean;
  brushTeeth?: boolean;
};

const WATER_PRESETS = [500, 1000];

type CollectOptions = {
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
  if (typeof values.water === "number" && values.water > 0) {
    input.water = values.water;
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
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm<FormValues>();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [ideals, setIdeals] = useState<Ideals>(EMPTY_IDEALS);
  const [presets, setPresets] = useState<WaterPreset[]>([]);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const watchedWeight = Form.useWatch("weight", form);
  const watchedWater = Form.useWatch("water", form);

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
    if (!user) return;
    return watchIdeals(user.uid, setIdeals, () => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return watchWaterPresets(user.uid, setPresets, () => {});
  }, [user]);

  useEffect(() => {
    if (status === "pending" || status === "saving") return;
    if (
      junkFoodDirtyRef.current ||
      junkDrinkDirtyRef.current ||
      bathDirtyRef.current ||
      brushTeethDirtyRef.current
    ) {
      return;
    }
    const entry = entries.find((item) => item.date === selectedDate);
    const queued = user ? getQueuedDailyInput(user.uid, selectedDate) : null;
    form.setFieldsValue({
      weight: queued?.weight ?? entry?.weight ?? null,
      water: queued?.water ?? entry?.water ?? null,
      junkFood: queued?.junkFood ?? entry?.junkFood ?? false,
      junkDrink: queued?.junkDrink ?? entry?.junkDrink ?? false,
      bath: queued?.bath ?? entry?.bath ?? false,
      brushTeeth: queued?.brushTeeth ?? entry?.brushTeeth ?? false,
    });
  }, [entries, selectedDate, status, form, user]);

  const flush = useCallback(async () => {
    timerRef.current = null;
    const values = latestValues.current;
    if (!user || !values) return;

    const input = collectInput(values, {
      includeJunkFood: junkFoodDirtyRef.current,
      includeJunkDrink: junkDrinkDirtyRef.current,
      includeBath: bathDirtyRef.current,
      includeBrushTeeth: brushTeethDirtyRef.current,
    });
    if (Object.keys(input).length === 0) {
      setStatus("idle");
      return;
    }

    const dateKey = values.date.format("YYYY-MM-DD");
    const baselineUpdatedAtMs =
      entries.find((item) => item.date === dateKey)?.updatedAt?.toMillis() ??
      null;

    setStatus("saving");
    try {
      const queued = await queueDailySave(
        user.uid,
        dateKey,
        input,
        baselineUpdatedAtMs,
      );
      junkFoodDirtyRef.current = false;
      junkDrinkDirtyRef.current = false;
      bathDirtyRef.current = false;
      brushTeethDirtyRef.current = false;
      setStatus(queued ? "offline" : "idle");
    } catch {
      setStatus("error");
    }
  }, [user, setStatus, entries]);

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

  function idealStatus(value: unknown, key: IdealKey): "error" | undefined {
    const numeric = typeof value === "number" ? value : null;
    const result = evaluateIdeal(numeric, ideals[key]);
    return result === "low" || result === "high" ? "error" : undefined;
  }

  return (
    <>
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

          <Form.Item
            label={
              <>
                <Icon name="weight" />
                Weight
                <IdealBadge status={weightEval} />
              </>
            }
          >
            <Tip title={weightTip} placement={weightPlacement}>
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
            </Tip>
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
              <Tip title={waterTip} placement={waterPlacement}>
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
              </Tip>
              <Flex gap={8} wrap align="center">
                {presets.length > 0
                  ? presets.map((preset) => (
                      <Tip
                        key={preset.id}
                        title={`${preset.ml} ml`}
                        placement="bottom"
                      >
                        <Button size="small" onClick={() => addWater(preset.ml)}>
                          {preset.name}
                        </Button>
                      </Tip>
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
      <WaterPresetsModal
        open={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        presets={presets}
      />
    </>
  );
}
