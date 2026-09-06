"use client";

import { useMemo, useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Flex,
  InputNumber,
  Modal,
  Segmented,
  theme,
  TimePicker,
  Typography,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Tip } from "@/components/tip";
import { relativeDate, todayKey } from "@/models/dailies";
import { evaluateIdeal, rangeText, type Ideals } from "@/models/ideals";
import {
  addBpReading,
  dailyBpAverages,
  deleteBpReading,
  formatBpTime,
  type BpArm,
  type BpPosture,
  type BpReading,
} from "@/models/bp";

const POSTURE_OPTIONS = [
  { label: "Sitting", value: "sitting" },
  { label: "Standing", value: "standing" },
];

const ARM_OPTIONS = [
  { label: "Left arm", value: "left" },
  { label: "Right arm", value: "right" },
];

const BP_TIPS = {
  systolicLow:
    "To nudge it up: drink more water, add a little salt, eat smaller and more frequent meals, and stand up slowly. See a doctor if you feel faint or dizzy.",
  systolicHigh:
    "To bring it down: cut back on salt and processed food, move daily, limit alcohol and caffeine, sleep well, and lower stress. See a doctor if it stays high.",
  diastolicLow:
    "To raise it: keep fluids up, don't skip meals, ease off alcohol, and rise slowly from sitting or lying down. See a doctor if it comes with fatigue or dizziness.",
  diastolicHigh:
    "To lower it: reduce salt, add potassium-rich foods (leafy greens, banana), exercise regularly, cut alcohol, and wind down before bed. See a doctor if it stays high.",
} as const;

function rowTip(reading: BpReading, ideals: Ideals): string | undefined {
  const sys = evaluateIdeal(reading.systolic, ideals.systolic);
  const dia = evaluateIdeal(reading.diastolic, ideals.diastolic);
  const lines: string[] = [];
  if (sys === "low" || sys === "high") {
    lines.push(
      `Systolic ${sys === "high" ? "above" : "below"} your ideal (${rangeText(
        ideals.systolic,
      )} mmHg). ${sys === "high" ? BP_TIPS.systolicHigh : BP_TIPS.systolicLow}`,
    );
  }
  if (dia === "low" || dia === "high") {
    lines.push(
      `Diastolic ${dia === "high" ? "above" : "below"} your ideal (${rangeText(
        ideals.diastolic,
      )} mmHg). ${dia === "high" ? BP_TIPS.diastolicHigh : BP_TIPS.diastolicLow}`,
    );
  }
  return lines.length > 0 ? lines.join(" ") : undefined;
}

export function BpModal({
  open,
  onClose,
  readings,
  ideals,
}: {
  open: boolean;
  onClose: () => void;
  readings: BpReading[];
  ideals: Ideals;
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [time, setTime] = useState<Dayjs>(() => dayjs());
  const [systolic, setSystolic] = useState<number | null>(null);
  const [diastolic, setDiastolic] = useState<number | null>(null);
  const [posture, setPosture] = useState<BpPosture>("sitting");
  const [arm, setArm] = useState<BpArm>("left");
  const [busy, setBusy] = useState(false);

  function handleClose() {
    setDate(dayjs());
    setTime(dayjs());
    setSystolic(null);
    setDiastolic(null);
    setPosture("sitting");
    setArm("left");
    onClose();
  }

  const dateKey = date.format("YYYY-MM-DD");

  const canAdd =
    typeof systolic === "number" &&
    systolic > 0 &&
    typeof diastolic === "number" &&
    diastolic > 0;

  const dayReadings = useMemo(
    () =>
      readings
        .filter((reading) => reading.date === dateKey)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [readings, dateKey],
  );

  const dailyAverage = useMemo(
    () => dailyBpAverages(dayReadings).get(dateKey) ?? null,
    [dayReadings, dateKey],
  );

  async function handleAdd() {
    if (!user || !canAdd) return;
    setBusy(true);
    try {
      await addBpReading(user.uid, {
        date: dateKey,
        systolic,
        diastolic,
        time: time.format("HH:mm"),
        posture,
        arm,
      });
      setSystolic(null);
      setDiastolic(null);
      setTime(dayjs());
    } catch {
      message.error("Could not add reading.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      await deleteBpReading(user.uid, id);
    } catch {
      message.error("Could not delete reading.");
    }
  }

  return (
    <Modal
      open={open}
      centered
      title="Blood pressure"
      footer={null}
      onCancel={handleClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Log each reading. Add as many as you take in a day — statistics use the
        daily average.
      </Typography.Paragraph>

      <Flex vertical gap={10} style={{ marginBottom: 20 }}>
        <Flex gap={8} wrap>
          <DatePicker
            value={date}
            onChange={(value) => value && setDate(value)}
            format="YYYY-MM-DD"
            allowClear={false}
            inputReadOnly
            maxDate={dayjs(todayKey())}
            style={{ flex: 1, minWidth: 150 }}
          />
          <TimePicker
            value={time}
            onChange={(value) => value && setTime(value)}
            format="HH:mm"
            needConfirm={false}
            allowClear={false}
            style={{ width: 110 }}
          />
        </Flex>
        <Flex gap={8} align="center">
          <InputNumber
            placeholder="Systolic"
            min={1}
            precision={0}
            value={systolic}
            onChange={setSystolic}
            style={{ flex: 1 }}
          />
          <span>/</span>
          <InputNumber
            placeholder="Diastolic"
            min={1}
            precision={0}
            value={diastolic}
            onChange={setDiastolic}
            style={{ flex: 1 }}
          />
          <Typography.Text type="secondary">mmHg</Typography.Text>
        </Flex>
        <Flex gap={8} wrap>
          <Segmented
            size="small"
            options={POSTURE_OPTIONS}
            value={posture}
            onChange={(value) => setPosture(value as BpPosture)}
          />
          <Segmented
            size="small"
            options={ARM_OPTIONS}
            value={arm}
            onChange={(value) => setArm(value as BpArm)}
          />
        </Flex>
        <Button
          type="primary"
          loading={busy}
          disabled={!canAdd}
          onClick={handleAdd}
        >
          Add reading
        </Button>
      </Flex>

      <Flex align="center" justify="space-between" gap={8}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {relativeDate(dateKey)}
        </Typography.Title>
        {dailyAverage && dayReadings.length > 1 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Avg {dailyAverage.systolic}/{dailyAverage.diastolic} mmHg
          </Typography.Text>
        ) : null}
      </Flex>

      {dayReadings.length === 0 ? (
        <Typography.Text type="secondary">
          No readings for this day.
        </Typography.Text>
      ) : (
        <Flex vertical>
          {dayReadings.map((reading) => {
            const tip = rowTip(reading, ideals);
            return (
              <Flex
                key={reading.id}
                align="center"
                justify="space-between"
                gap={8}
                style={{ padding: "8px 0" }}
              >
                <Tip title={tip}>
                  <Typography.Text style={{ cursor: tip ? "help" : undefined }}>
                    <Typography.Text
                      strong
                      style={{ color: tip ? token.colorError : undefined }}
                    >
                      {reading.systolic}/{reading.diastolic}
                    </Typography.Text>{" "}
                    mmHg · {formatBpTime(reading.date, reading.time)} ·{" "}
                    {reading.posture}, {reading.arm} arm
                  </Typography.Text>
                </Tip>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(reading.id)}
                />
              </Flex>
            );
          })}
        </Flex>
      )}
    </Modal>
  );
}
