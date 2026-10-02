"use client";

import { useState, type CSSProperties } from "react";
import { DatePicker, Flex, Segmented } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { todayKey } from "@/models/dailies";

export type DateRange = [Dayjs | null, Dayjs];

const RANGE_OPTIONS = [
  { label: "7D", value: "7" },
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "1Y", value: "365" },
  { label: "All", value: "all" },
];

const PRESET_DAYS = ["7", "30", "90", "365"] as const;

export function useDateRange(initialDays = 30) {
  return useState<DateRange>(() => {
    const now = dayjs(todayKey());
    return [now.subtract(initialDays - 1, "day"), now];
  });
}

export function RangeFilter({
  range,
  onChange,
  ariaLabel = "Date range",
  style,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
  ariaLabel?: string;
  style?: CSSProperties;
}) {
  const today = dayjs(todayKey());
  const [start, end] = range;
  const [custom, setCustom] = useState(false);
  const endIsToday = end.isSame(today, "day");
  const presetValue = endIsToday
    ? start == null
      ? "all"
      : PRESET_DAYS.find((n) => today.diff(start, "day") + 1 === Number(n))
    : undefined;
  const value = custom || !presetValue ? "custom" : presetValue;

  function applyPreset(next: string) {
    setCustom(next === "custom");
    if (next === "custom") return;
    if (next === "all") onChange([null, today]);
    else onChange([today.subtract(Number(next) - 1, "day"), today]);
  }

  return (
    <Flex align="center" justify="center" gap={10} wrap style={style}>
      <Flex gap={8}>
        <Segmented
          options={RANGE_OPTIONS}
          value={value === "custom" ? "" : value}
          onChange={(next) => applyPreset(next as string)}
        />
        <Segmented
          options={[{ label: "Custom", value: "custom" }]}
          value={value === "custom" ? "custom" : ""}
          onChange={(next) => applyPreset(next as string)}
        />
      </Flex>
      {value === "custom" && (
        <DatePicker.RangePicker
          aria-label={ariaLabel}
          value={[start, end]}
          onChange={(values) => {
            if (!values) return;
            onChange([values[0], values[1] ?? today]);
          }}
          format="MMM D, YYYY"
          allowClear={false}
          allowEmpty={[true, false]}
          inputReadOnly
          maxDate={today}
          style={{ width: 270 }}
        />
      )}
    </Flex>
  );
}
