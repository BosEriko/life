"use client";

import { Card, Flex, Typography, theme } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, SafetyOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useHealthData } from "@/components/health-data-provider";
import { accountTextColor, money } from "@/lib/finance";
import { Tip } from "@/components/tip";
import { todayKey } from "@/models/users/dailies";

const STATUS_COLORS = { good: "#2f6b45", fair: "#7a5212", low: "#8c442c", neutral: "#3e5a4a" };

export function EmergencyFundBanner() {
  const { token } = theme.useToken();
  const { financeAccounts, financeRecords } = useHealthData();
  const accounts = financeAccounts.filter((account) => !account.deletedAt && !account.excludeFromStatistics);
  if (accounts.length === 0) return null;

  const currencyCounts = new Map<string, number>();
  for (const account of accounts) currencyCounts.set(account.currency, (currencyCounts.get(account.currency) ?? 0) + 1);
  const currency = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const inCurrency = accounts.filter((account) => account.currency === currency);
  const ids = new Set(inCurrency.map((account) => account.id));
  const balance = inCurrency.reduce((sum, account) => sum + account.balanceMinor, 0);

  const today = dayjs(todayKey());
  const since = today.subtract(11, "month").startOf("month").format("YYYY-MM-DD");
  const expenses = financeRecords.filter((record) => record.type === "expense" && ids.has(record.accountId) && record.date >= since);
  const spent = expenses.reduce((sum, record) => sum + record.amountMinor, 0);
  const firstMonth = expenses.reduce((min, record) => (record.date < min ? record.date : min), today.format("YYYY-MM-DD"));
  const monthsCovered = Math.min(12, today.diff(dayjs(firstMonth).startOf("month"), "month") + 1);
  const average = expenses.length ? Math.round(spent / monthsCovered) : 0;
  const months = average > 0 ? Math.max(0, balance / average) : null;
  const shown = months === null ? null : months >= 10 ? Math.floor(months) : Math.floor(months * 10) / 10;

  const status = months === null ? "neutral" : months >= 6 ? "good" : months >= 3 ? "fair" : "low";
  const color = STATUS_COLORS[status];
  const Icon = status === "good" ? CheckCircleOutlined : status === "fair" ? ExclamationCircleOutlined : status === "low" ? WarningOutlined : CheckCircleOutlined;
  const label = status === "good" ? "Healthy · 6+ months" : status === "fair" ? "Building · 3–6 months" : status === "low" ? "Low · under 3 months" : null;

  const textColor = accountTextColor(color);
  const formula = `Total balance of your ${currency} accounts that count toward statistics ÷ your average monthly spending from those accounts over the last ${monthsCovered === 1 ? "month" : `${monthsCovered} months`} (up to 12). 6+ months is healthy, 3–6 is building, under 3 is low.`;

  return (
    <Card
      role="status"
      styles={{ body: { padding: 16 } }}
      style={{ marginBottom: 24, position: "relative", overflow: "hidden", background: color, borderColor: color, color: textColor, boxShadow: token.boxShadowTertiary }}
    >
      <SafetyOutlined aria-hidden style={{ position: "absolute", right: -10, bottom: -13, fontSize: 96, opacity: 0.14, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <Flex align="center" justify="space-between" gap={8}>
          <Typography.Text strong style={{ color: "inherit" }}><Icon style={{ marginRight: 8 }} />Emergency fund</Typography.Text>
          <Tip title={formula} placement="left">
            <InfoCircleOutlined aria-label={formula} style={{ opacity: 0.85, cursor: "help" }} />
          </Tip>
        </Flex>
        {shown === null ? (
          <Typography.Text style={{ display: "block", color: "inherit", fontSize: 16, marginTop: 6 }}>Log your expenses to see how many months your money would last.</Typography.Text>
        ) : (
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{shown} {shown === 1 ? "month" : "months"}</div>
        )}
        <Typography.Text style={{ display: "block", color: "inherit", opacity: 0.9, fontSize: 12, marginTop: 4, overflowWrap: "anywhere" }}>
          {label ? `${label} · ` : ""}{money(balance, currency)} across {inCurrency.length} {inCurrency.length === 1 ? "account" : "accounts"}
          {average > 0 ? ` · ${money(average, currency)} average monthly spending` : ""}
        </Typography.Text>
      </div>
    </Card>
  );
}
