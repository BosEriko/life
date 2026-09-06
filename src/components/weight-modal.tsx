"use client";

import { useMemo, useState } from "react";
import { App, DatePicker, Flex, InputNumber, Modal, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { Tip } from "@/components/tip";
import { useUnits } from "@/components/units-provider";
import {
  convertRange,
  fromKg,
  toKg,
  weightStep,
  weightSuffix,
} from "@/lib/units";
import {
  relativeDate,
  saveDaily,
  todayKey,
  type DailyEntry,
} from "@/models/dailies";
import { evaluateIdeal, rangeText, type Ideals } from "@/models/ideals";

export function WeightModal({
  open,
  onClose,
  entries,
  ideals,
}: {
  open: boolean;
  onClose: () => void;
  entries: DailyEntry[];
  ideals: Ideals;
}) {
  const units = useUnits();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [edited, setEdited] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  const dateKey = date.format("YYYY-MM-DD");

  const entry = useMemo(
    () => entries.find((item) => item.date === dateKey) ?? null,
    [entries, dateKey],
  );

  const savedKg = entry?.weight ?? null;

  const savedDisplay =
    savedKg != null ? Math.round(fromKg(savedKg, units.weight) * 10) / 10 : null;
  const shown = touched ? edited : savedDisplay;

  const shownKg =
    typeof shown === "number" ? toKg(shown, units.weight) : null;
  const evalStatus = evaluateIdeal(shownKg, ideals.weight);
  const off = evalStatus === "low" || evalStatus === "high";
  const rangeLabel = rangeText(
    convertRange(ideals.weight, (value) => fromKg(value, units.weight)),
  );
  const tip = off
    ? `${evalStatus === "high" ? "Above" : "Below"} your ideal (${rangeLabel} ${weightSuffix(
        units.weight,
      )})`
    : undefined;

  function handleClose() {
    setDate(dayjs());
    setEdited(null);
    setTouched(false);
    onClose();
  }

  function changeDate(next: Dayjs) {
    setDate(next);
    setEdited(null);
    setTouched(false);
  }

  function handleSave() {
    if (!user || typeof shown !== "number" || shown <= 0) return;
    const kg = Math.round(toKg(shown, units.weight) * 100) / 100;
    saveDaily(user.uid, dateKey, { weight: kg }).catch(() =>
      message.error("Could not save. Try again."),
    );
    message.success(
      navigator.onLine ? "Weight saved" : "Saved offline · will sync",
    );
    handleClose();
  }

  return (
    <Modal
      open={open}
      centered
      title="Weight"
      okText="Save"
      okButtonProps={{ disabled: typeof shown !== "number" || shown <= 0 }}
      onOk={handleSave}
      onCancel={handleClose}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        One reading per day. Pick a date to review or update it.
      </Typography.Paragraph>

      <Flex vertical gap={10}>
        <DatePicker
          value={date}
          onChange={(value) => value && changeDate(value)}
          format="YYYY-MM-DD"
          allowClear={false}
          inputReadOnly
          maxDate={dayjs(todayKey())}
          style={{ width: "100%" }}
        />
        <Tip title={tip} placement={evalStatus === "low" ? "bottom" : "top"}>
          <div>
            <InputNumber
              style={{ width: "100%" }}
              min={1}
              step={weightStep(units.weight)}
              suffix={weightSuffix(units.weight)}
              placeholder={units.weight === "lb" ? "160" : "72.5"}
              status={off ? "error" : undefined}
              value={shown}
              onChange={(value) => {
                setTouched(true);
                setEdited(value);
              }}
            />
          </div>
        </Tip>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {savedDisplay != null
            ? `${relativeDate(dateKey)}: ${savedDisplay} ${weightSuffix(units.weight)} recorded`
            : `${relativeDate(dateKey)}: nothing recorded yet`}
        </Typography.Text>
      </Flex>
    </Modal>
  );
}
