"use client";

import { Flex, Typography, theme } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useHealthData } from "@/components/health-data-provider";
import { money } from "@/lib/finance";
import { todayKey } from "@/models/dailies";

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
  const color = status === "good" ? token.colorSuccess : status === "fair" ? token.colorWarning : status === "low" ? token.colorError : token.colorPrimary;
  const Icon = status === "good" ? CheckCircleOutlined : status === "fair" ? ExclamationCircleOutlined : status === "low" ? WarningOutlined : CheckCircleOutlined;
  const label = status === "good" ? "Healthy · 6+ months" : status === "fair" ? "Building · 3–6 months" : status === "low" ? "Low · under 3 months" : null;

  return (
    <div
      role="status"
      style={{
        marginBottom: 24,
        padding: "18px 20px",
        borderRadius: token.borderRadiusLG,
        background: `color-mix(in srgb, ${color} 10%, ${token.colorBgContainer})`,
        border: `1px solid color-mix(in srgb, ${color} 35%, ${token.colorBorderSecondary})`,
        boxShadow: token.boxShadowTertiary,
      }}
    >
      <Flex align="flex-start" gap={14}>
        <Icon style={{ fontSize: 22, color, marginTop: 2 }} />
        <div style={{ minWidth: 0 }}>
          {shown === null ? (
            <Typography.Text style={{ fontSize: 16 }}>Log your expenses to see how many months your money would last.</Typography.Text>
          ) : (
            <Typography.Text style={{ fontSize: 16 }}>
              You have <strong>{shown} {shown === 1 ? "month" : "months"}</strong> of emergency fund based on your spending.
            </Typography.Text>
          )}
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 4 }}>
            {label ? `${label} · ` : ""}{money(balance, currency)} across {inCurrency.length} {inCurrency.length === 1 ? "account" : "accounts"}
            {average > 0 ? ` ÷ ${money(average, currency)} average monthly spending (last ${monthsCovered === 1 ? "month" : `${monthsCovered} months`})` : ""}
          </Typography.Text>
        </div>
      </Flex>
    </div>
  );
}
