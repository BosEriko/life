"use client";

import { Column } from "@ant-design/charts";

export type MonthPoint = { month: string; type: "Income" | "Expenses"; value: number };

export function FinanceMonthChart({
  data,
  currency,
  colors,
  isDark,
  average,
}: {
  data: MonthPoint[];
  currency: string;
  colors: [string, string];
  isDark: boolean;
  average?: number;
}) {
  return (
    <Column
      data={data}
      xField="month"
      yField="value"
      colorField="type"
      group
      autoFit
      height={280}
      theme={isDark ? "classicDark" : "classic"}
      legend={{ color: { position: "top" } }}
      scale={{ color: { domain: ["Income", "Expenses"], range: colors } }}
      axis={{ x: { title: null }, y: { title: null, labelFormatter: (value: number) => Intl.NumberFormat(undefined, { notation: "compact" }).format(value) } }}
      style={{ radiusTopLeft: 4, radiusTopRight: 4, inset: 1 }}
      annotations={average ? [{ type: "lineY", data: [average], style: { stroke: colors[1], lineWidth: 1.5, lineDash: [4, 4] }, tooltip: false }] : undefined}
      tooltip={{ items: [{ channel: "y", valueFormatter: (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value) }] }}
    />
  );
}
