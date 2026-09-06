"use client";

import { useMemo, useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Flex,
  InputNumber,
  Modal,
  TimePicker,
  Typography,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { Tip } from "@/components/tip";
import { WaterPresetsModal } from "@/components/water-presets-modal";
import { relativeDate, todayKey } from "@/models/dailies";
import { type WaterPreset } from "@/models/presets";
import {
  addWaterLog,
  dailyWaterTotals,
  deleteWaterLog,
  formatWaterTime,
  type WaterLog,
} from "@/models/water";

const FALLBACK_AMOUNTS = [500, 1000];

export function WaterModal({
  open,
  onClose,
  logs,
  presets,
}: {
  open: boolean;
  onClose: () => void;
  logs: WaterLog[];
  presets: WaterPreset[];
}) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [time, setTime] = useState<Dayjs>(() => dayjs());
  const [ml, setMl] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);

  function handleClose() {
    setDate(dayjs());
    setTime(dayjs());
    setMl(null);
    onClose();
  }

  const dateKey = date.format("YYYY-MM-DD");
  const canAdd = typeof ml === "number" && ml > 0;

  const dayLogs = useMemo(
    () =>
      logs
        .filter((log) => log.date === dateKey)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [logs, dateKey],
  );

  const dailyTotal = useMemo(
    () => dailyWaterTotals(dayLogs).get(dateKey)?.ml ?? 0,
    [dayLogs, dateKey],
  );

  async function logAmount(amount: number, label?: string) {
    if (!user) return;
    setBusy(true);
    try {
      await addWaterLog(user.uid, {
        date: dateKey,
        ml: amount,
        time: dayjs().format("HH:mm"),
        label: label ?? null,
      });
    } catch {
      message.error("Could not add water.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!user || !canAdd) return;
    setBusy(true);
    try {
      await addWaterLog(user.uid, {
        date: dateKey,
        ml,
        time: time.format("HH:mm"),
      });
      setMl(null);
      setTime(dayjs());
    } catch {
      message.error("Could not add water.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      await deleteWaterLog(user.uid, id);
    } catch {
      message.error("Could not delete entry.");
    }
  }

  return (
    <Modal
      open={open}
      centered
      title="Water"
      footer={null}
      onCancel={handleClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Log each drink. Tap a container to log it now, or enter a custom amount.
      </Typography.Paragraph>

      <Flex gap={8} wrap align="center" style={{ marginBottom: 12 }}>
        {presets.length > 0
          ? presets.map((preset) => (
              <Tip key={preset.id} title={`${preset.ml} ml`} placement="bottom">
                <Button
                  size="small"
                  disabled={busy}
                  onClick={() => logAmount(preset.ml, preset.name)}
                >
                  {preset.name}
                </Button>
              </Tip>
            ))
          : FALLBACK_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                size="small"
                disabled={busy}
                onClick={() => logAmount(amount)}
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
            placeholder="Amount"
            min={1}
            step={50}
            precision={0}
            value={ml}
            onChange={setMl}
            style={{ flex: 1 }}
          />
          <Typography.Text type="secondary">ml</Typography.Text>
        </Flex>
        <Button
          type="primary"
          loading={busy}
          disabled={!canAdd}
          onClick={handleAdd}
        >
          Add
        </Button>
      </Flex>

      <Flex align="center" justify="space-between" gap={8}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {relativeDate(dateKey)}
        </Typography.Title>
        {dayLogs.length > 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Total {dailyTotal} ml · {dayLogs.length} drink
            {dayLogs.length === 1 ? "" : "s"}
          </Typography.Text>
        ) : null}
      </Flex>

      {dayLogs.length === 0 ? (
        <Typography.Text type="secondary">
          No water logged this day.
        </Typography.Text>
      ) : (
        <Flex vertical>
          {dayLogs.map((log) => (
            <Flex
              key={log.id}
              align="center"
              justify="space-between"
              gap={8}
              style={{ padding: "8px 0" }}
            >
              <Typography.Text>
                <Typography.Text strong>{log.ml}</Typography.Text> ml ·{" "}
                {formatWaterTime(log.date, log.time)}
                {log.label ? ` · ${log.label}` : ""}
              </Typography.Text>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(log.id)}
              />
            </Flex>
          ))}
        </Flex>
      )}

      <WaterPresetsModal
        open={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        presets={presets}
      />
    </Modal>
  );
}
