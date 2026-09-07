"use client";

import { useMemo, useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Flex,
  InputNumber,
  Modal,
  theme,
  TimePicker,
  Typography,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { Tip } from "@/components/tip";
import { confirmDestroy } from "@/lib/confirm-destroy";
import { WaterPresetsModal } from "@/components/water-presets-modal";
import { useUnits } from "@/components/units-provider";
import {
  formatVolume,
  toMl,
  volumeDecimals,
  volumeStep,
  volumeSuffix,
} from "@/lib/units";
import { relativeDate, todayKey } from "@/models/dailies";
import { evaluateIdeal, rangeText, type Ideals } from "@/models/ideals";
import { type WaterPreset } from "@/models/presets";
import {
  addWaterLog,
  dailyWaterTotals,
  deleteWaterLog,
  formatWaterTime,
  type WaterLog,
} from "@/models/water";

const FALLBACK_AMOUNTS = [500, 1000];

const WATER_TIPS = {
  low: "Sip steadily through the day rather than in big gulps, keep a bottle in sight, and add water-rich foods. A dry mouth, dark urine, or a dull headache means catch up now.",
  high: "Well above your target — no need to force more. Drinking a lot in a short window can dilute your sodium, so spread it out and ease off if you feel bloated or headachy.",
};

export function WaterModal({
  open,
  onClose,
  logs,
  presets,
  ideals,
}: {
  open: boolean;
  onClose: () => void;
  logs: WaterLog[];
  presets: WaterPreset[];
  ideals: Ideals;
}) {
  const units = useUnits();
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [time, setTime] = useState<Dayjs>(() => dayjs());
  const [amount, setAmount] = useState<number | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);

  function handleClose() {
    setDate(dayjs());
    setTime(dayjs());
    setAmount(null);
    onClose();
  }

  const dateKey = date.format("YYYY-MM-DD");
  const canAdd = typeof amount === "number" && amount > 0;

  const dayLogs = useMemo(
    () =>
      logs
        .filter((log) => log.date === dateKey)
        .sort((a, b) => b.time.localeCompare(a.time)),
    [logs, dateKey],
  );

  const dailyTotalMl = useMemo(
    () => dailyWaterTotals(dayLogs).get(dateKey)?.ml ?? 0,
    [dayLogs, dateKey],
  );

  const totalEval = evaluateIdeal(
    dayLogs.length > 0 ? dailyTotalMl : null,
    ideals.water,
  );
  const totalTip =
    totalEval === "low" || totalEval === "high"
      ? `Daily total ${totalEval === "high" ? "above" : "below"} your ideal (${rangeText(
          ideals.water,
        )} ml). ${totalEval === "high" ? WATER_TIPS.high : WATER_TIPS.low}`
      : undefined;

  function logAmount(ml: number, label?: string) {
    if (!user) return;
    addWaterLog(user.uid, {
      date: dateKey,
      ml,
      time: dayjs().format("HH:mm"),
      label: label ?? null,
    }).catch(() => message.error("Could not add water."));
  }

  function handleAdd() {
    if (!user || !canAdd) return;
    const payload = {
      date: dateKey,
      ml: Math.round(toMl(amount, units.volume)),
      time: time.format("HH:mm"),
    };
    setAmount(null);
    setTime(dayjs());
    addWaterLog(user.uid, payload).catch(() =>
      message.error("Could not add water."),
    );
  }

  function handleDelete(id: string) {
    if (!user) return;
    deleteWaterLog(user.uid, id).catch(() =>
      message.error("Could not delete entry."),
    );
  }

  return (
    <Modal
      open={open}
      centered
      title={
        <>
          <Icon name="water" />
          Water
        </>
      }
      footer={null}
      onCancel={handleClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        Log each drink. Tap a container to log it now, or enter a custom amount.
      </Typography.Paragraph>

      <Flex gap={8} wrap align="center" style={{ marginBottom: 12 }}>
        {presets.length > 0
          ? presets.map((preset) => (
              <Tip
                key={preset.id}
                title={formatVolume(preset.ml, units.volume)}
                placement="bottom"
              >
                <Button
                  size="small"
                  onClick={() => logAmount(preset.ml, preset.name)}
                >
                  {preset.name}
                </Button>
              </Tip>
            ))
          : FALLBACK_AMOUNTS.map((ml) => (
              <Button key={ml} size="small" onClick={() => logAmount(ml)}>
                {formatVolume(ml, units.volume)}
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
            min={volumeDecimals(units.volume) > 0 ? 0.01 : 1}
            step={volumeStep(units.volume)}
            precision={volumeDecimals(units.volume)}
            prefix={
              <Icon name="water" style={{ marginRight: 0, opacity: 0.45 }} />
            }
            value={amount}
            onChange={setAmount}
            style={{ flex: 1 }}
          />
          <Typography.Text type="secondary">
            {volumeSuffix(units.volume)}
          </Typography.Text>
        </Flex>
        <Button type="primary" disabled={!canAdd} onClick={handleAdd}>
          Add
        </Button>
      </Flex>

      <Flex align="center" justify="space-between" gap={8}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {relativeDate(dateKey)}
        </Typography.Title>
        {dayLogs.length > 0 ? (
          <Tip title={totalTip}>
            <Typography.Text
              type={totalTip ? undefined : "secondary"}
              style={{
                fontSize: 12,
                cursor: totalTip ? "help" : undefined,
                color: totalTip ? token.colorError : undefined,
              }}
            >
              Total {formatVolume(dailyTotalMl, units.volume)} · {dayLogs.length}{" "}
              drink{dayLogs.length === 1 ? "" : "s"}
            </Typography.Text>
          </Tip>
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
                <Typography.Text strong>
                  {formatVolume(log.ml, units.volume)}
                </Typography.Text>{" "}
                · {formatWaterTime(log.date, log.time)}
                {log.label ? ` · ${log.label}` : ""}
              </Typography.Text>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  confirmDestroy(modal, {
                    title: "Delete this entry?",
                    onOk: () => handleDelete(log.id),
                  })
                }
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
