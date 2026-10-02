"use client";

import { Line, Pie } from "@ant-design/charts";

const currencyFormat = (currency: string) => (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);

export function NetLineChart({ data, currency, color, isDark }: { data: { label: string; value: number }[]; currency: string; color: string; isDark: boolean }) {
  return (
    <Line
      data={data}
      xField="label"
      yField="value"
      autoFit
      height={220}
      theme={isDark ? "classicDark" : "classic"}
      scale={{ color: { range: [color] } }}
      style={{ lineWidth: 2, stroke: color }}
      axis={{ x: { title: null, tickCount: 6 }, y: { title: null, labelFormatter: (value: number) => Intl.NumberFormat(undefined, { notation: "compact" }).format(value) } }}
      tooltip={{ items: [{ channel: "y", name: "Net", valueFormatter: currencyFormat(currency) }] }}
    />
  );
}

export function CategoryDonut({ data, currency, domain, range, isDark }: { data: { category: string; value: number }[]; currency: string; domain: string[]; range: string[]; isDark: boolean }) {
  return (
    <Pie
      data={data}
      angleField="value"
      colorField="category"
      innerRadius={0.62}
      autoFit
      height={200}
      theme={isDark ? "classicDark" : "classic"}
      legend={false}
      scale={{ color: { domain, range } }}
      style={{ stroke: isDark ? "#1a211c" : "#ffffff", lineWidth: 2 }}
      tooltip={{ items: [{ channel: "y", valueFormatter: currencyFormat(currency) }] }}
    />
  );
}
