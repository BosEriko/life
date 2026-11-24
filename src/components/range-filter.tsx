"use client";

import { useState, type CSSProperties } from "react";
import { DatePicker, Flex, Segmented } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { todayKey } from "@/models/users/dailies";

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
  thisMonth = false,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
  ariaLabel?: string;
  style?: CSSProperties;
  thisMonth?: boolean;
}) {
  const today = dayjs(todayKey());
  const [start, end] = range;
  const [custom, setCustom] = useState(false);
  const [month, setMonth] = useState(false);
  const endIsToday = end.isSame(today, "day");
  const isMonth = thisMonth && endIsToday && start != null && start.isSame(today.startOf("month"), "day");
  const presetValue = endIsToday
    ? start == null
      ? "all"
      : PRESET_DAYS.find((n) => today.diff(start, "day") + 1 === Number(n))
    : undefined;
  const value = custom ? "custom" : isMonth && (month || !presetValue) ? "month" : presetValue ?? "custom";

  function applyPreset(next: string) {
    setCustom(next === "custom");
    setMonth(next === "month");
    if (next === "custom") return;
    if (next === "month") onChange([today.startOf("month"), today]);
    else if (next === "all") onChange([null, today]);
    else onChange([today.subtract(Number(next) - 1, "day"), today]);
  }

  return (
    <Flex align="center" justify="center" gap={10} wrap style={style}>
      <Flex gap={8} wrap justify="center">
        <Segmented
          options={RANGE_OPTIONS}
          value={value === "custom" || value === "month" ? "" : value}
          onChange={(next) => applyPreset(next as string)}
        />
        {thisMonth && <Segmented
          options={[{ label: "This month", value: "month" }]}
          value={value === "month" ? "month" : ""}
          onChange={(next) => applyPreset(next as string)}
        />}
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
