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
  TimePicker,
  Typography,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { relativeDate, todayKey } from "@/models/dailies";
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

export function BpModal({
  open,
  onClose,
  readings,
}: {
  open: boolean;
  onClose: () => void;
  readings: BpReading[];
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
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
          {dayReadings.map((reading) => (
            <Flex
              key={reading.id}
              align="center"
              justify="space-between"
              gap={8}
              style={{ padding: "8px 0" }}
            >
              <Typography.Text>
                <Typography.Text strong>
                  {reading.systolic}/{reading.diastolic}
                </Typography.Text>{" "}
                mmHg · {formatBpTime(reading.date, reading.time)} ·{" "}
                {reading.posture}, {reading.arm} arm
              </Typography.Text>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(reading.id)}
              />
            </Flex>
          ))}
        </Flex>
      )}
    </Modal>
  );
}
