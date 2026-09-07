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
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Icon } from "@/components/icon";
import { Tip } from "@/components/tip";
import { relativeDate, todayKey } from "@/models/dailies";
import {
  evaluateIdeal,
  rangeText,
  type IdealRange,
  type Ideals,
} from "@/models/ideals";
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

function metricTip(
  value: number,
  range: IdealRange,
  label: "Systolic" | "Diastolic",
): string | undefined {
  const status = evaluateIdeal(value, range);
  if (status !== "low" && status !== "high") return undefined;
  return `${label} ${status === "high" ? "above" : "below"} your ideal (${rangeText(
    range,
  )} mmHg)`;
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
        .sort((a, b) => b.time.localeCompare(a.time)),
    [readings, dateKey],
  );

  const dailyAverage = useMemo(
    () => dailyBpAverages(dayReadings).get(dateKey) ?? null,
    [dayReadings, dateKey],
  );

  const avgSysTip = dailyAverage
    ? metricTip(dailyAverage.systolic, ideals.systolic, "Systolic")
    : undefined;
  const avgDiaTip = dailyAverage
    ? metricTip(dailyAverage.diastolic, ideals.diastolic, "Diastolic")
    : undefined;

  function handleAdd() {
    if (!user || !canAdd) return;
    const payload = {
      date: dateKey,
      systolic,
      diastolic,
      time: time.format("HH:mm"),
      posture,
      arm,
    };
    setSystolic(null);
    setDiastolic(null);
    setTime(dayjs());
    addBpReading(user.uid, payload).catch(() =>
      message.error("Could not add reading."),
    );
  }

  function handleDelete(id: string) {
    if (!user) return;
    deleteBpReading(user.uid, id).catch(() =>
      message.error("Could not delete reading."),
    );
  }

  return (
    <Modal
      open={open}
      centered
      title={
        <>
          <Icon name="bp" />
          Blood pressure
        </>
      }
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
        <Button type="primary" disabled={!canAdd} onClick={handleAdd}>
          Add reading
        </Button>
      </Flex>

      <Flex align="center" justify="space-between" gap={8}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {relativeDate(dateKey)}
        </Typography.Title>
        {dailyAverage && dayReadings.length > 1 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Avg{" "}
            <Tip title={avgSysTip}>
              <Typography.Text
                style={{
                  fontSize: 12,
                  color: avgSysTip ? token.colorError : undefined,
                  cursor: avgSysTip ? "help" : undefined,
                }}
              >
                {dailyAverage.systolic}
              </Typography.Text>
            </Tip>
            /
            <Tip title={avgDiaTip}>
              <Typography.Text
                style={{
                  fontSize: 12,
                  color: avgDiaTip ? token.colorError : undefined,
                  cursor: avgDiaTip ? "help" : undefined,
                }}
              >
                {dailyAverage.diastolic}
              </Typography.Text>
            </Tip>{" "}
            mmHg
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
            const sysTip = metricTip(
              reading.systolic,
              ideals.systolic,
              "Systolic",
            );
            const diaTip = metricTip(
              reading.diastolic,
              ideals.diastolic,
              "Diastolic",
            );
            return (
              <Flex
                key={reading.id}
                align="center"
                justify="space-between"
                gap={8}
                style={{ padding: "8px 0" }}
              >
                <Flex vertical gap={2}>
                  <Typography.Text>
                    <Tip title={sysTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: sysTip ? token.colorError : undefined,
                          cursor: sysTip ? "help" : undefined,
                        }}
                      >
                        {reading.systolic}
                      </Typography.Text>
                    </Tip>
                    /
                    <Tip title={diaTip}>
                      <Typography.Text
                        strong
                        style={{
                          color: diaTip ? token.colorError : undefined,
                          cursor: diaTip ? "help" : undefined,
                        }}
                      >
                        {reading.diastolic}
                      </Typography.Text>
                    </Tip>{" "}
                    mmHg · {formatBpTime(reading.date, reading.time)}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Taken while {reading.posture}, on the {reading.arm} arm
                  </Typography.Text>
                </Flex>
                <ConfirmDeleteButton
                  ariaLabel="Delete reading"
                  onConfirm={() => handleDelete(reading.id)}
                />
              </Flex>
            );
          })}
        </Flex>
      )}
    </Modal>
  );
}
