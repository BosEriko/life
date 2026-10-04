"use client";

import { App, Button, Card, Dropdown, Flex, Typography, theme } from "antd";
import { CheckCircleOutlined, DownOutlined, ExclamationCircleOutlined, FieldTimeOutlined, InfoCircleOutlined, SafetyOutlined, ShoppingOutlined, WalletOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { accountTextColor, EMERGENCY_FUND_MONTHS, money } from "@/lib/finance";
import { setEmergencyFundMonths } from "@/models/users/finance";
import { Tip } from "@/components/tip";
import { todayKey } from "@/models/users/dailies";

const STATUS_COLORS = { good: "#2f6b45", fair: "#7a5212", low: "#8c442c", neutral: "#3e5a4a" };

export function EmergencyFundBanner() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { user } = useAuth();
  const { financeAccounts, financeRecords, financeEmergencyFundMonths: goal } = useHealthData();
  const accounts = financeAccounts.filter((account) => !account.deletedAt && !account.excludeFromStatistics);
  if (accounts.length === 0) return null;

  const currencyCounts = new Map<string, number>();
  for (const account of accounts) currencyCounts.set(account.currency, (currencyCounts.get(account.currency) ?? 0) + 1);
  const currency = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const inCurrency = accounts.filter((account) => account.currency === currency);
  const ids = new Set(inCurrency.map((account) => account.id));
  const balance = inCurrency.reduce((sum, account) => sum + account.balanceMinor, 0);

  const thisMonth = dayjs(todayKey()).startOf("month");
  const since = thisMonth.subtract(12, "month").format("YYYY-MM-DD");
  const until = thisMonth.format("YYYY-MM-DD");
  const expenses = financeRecords.filter((record) => record.type === "expense" && ids.has(record.accountId) && record.date >= since && record.date < until);
  const spent = expenses.reduce((sum, record) => sum + record.amountMinor, 0);
  const firstMonth = expenses.reduce((min, record) => (record.date < min ? record.date : min), until);
  const monthsCovered = Math.min(12, Math.max(1, thisMonth.diff(dayjs(firstMonth).startOf("month"), "month")));
  const average = expenses.length ? Math.round(spent / monthsCovered) : 0;
  const months = average > 0 ? Math.max(0, balance / average) : null;
  const shown = months === null ? null : months >= 10 ? Math.floor(months) : Math.floor(months * 10) / 10;

  const status = months === null ? "neutral" : months >= goal ? "good" : months >= goal / 2 ? "fair" : "low";
  const color = STATUS_COLORS[status];
  const Icon = status === "good" ? CheckCircleOutlined : status === "fair" ? ExclamationCircleOutlined : status === "low" ? WarningOutlined : CheckCircleOutlined;
  const label = status === "good" ? "Healthy" : status === "fair" ? "Building" : status === "low" ? "Low" : null;

  const textColor = accountTextColor(color);
  const accountCount = `${inCurrency.length} ${inCurrency.length === 1 ? "account" : "accounts"}`;
  const formula = `Total balance of your ${accountCount} in ${currency} that count toward statistics ÷ your average monthly spending from those accounts over the last ${monthsCovered === 1 ? "full month" : `${monthsCovered} full months`} (up to 12, not counting this month). Your goal is ${monthsText(goal)}: reaching it is healthy, at least half of it is building, and under half is low.`;
  const chooseGoal = (months: number) => {
    if (user) void setEmergencyFundMonths(user.uid, months).catch(() => message.error("Could not save your emergency fund goal."));
  };

  return (
    <Card
      role="status"
      styles={{ body: { padding: 20 } }}
      style={{ marginBottom: 24, position: "relative", overflow: "hidden", background: color, borderColor: color, color: textColor, boxShadow: token.boxShadowTertiary }}
    >
      <SafetyOutlined aria-hidden style={{ position: "absolute", right: -10, bottom: -13, fontSize: 96, opacity: 0.14, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <Flex align="center" justify="space-between" gap={8} wrap>
          <Flex align="center" gap={10} wrap>
            <Typography.Text strong style={{ color: "inherit" }}><Icon style={{ marginRight: 8 }} />Emergency fund</Typography.Text>
            {label && <span style={{ padding: "2px 10px", borderRadius: 999, background: "rgba(0, 0, 0, 0.22)", fontSize: 12, fontWeight: 600 }}>{label}</span>}
          </Flex>
          <Flex align="center" gap={8}>
            <Dropdown trigger={["click"]} menu={{ items: EMERGENCY_FUND_MONTHS.map((value) => ({ key: String(value), label: monthsText(value) })), selectable: true, selectedKeys: [String(goal)], onClick: ({ key }) => chooseGoal(Number(key)), style: { maxHeight: 280, overflowY: "auto" } }}>
              <Button type="text" size="small" aria-label={`Emergency fund goal: ${monthsText(goal)}. Change goal`} style={{ color: "inherit", fontWeight: 600, background: "rgba(0, 0, 0, 0.22)", borderRadius: 999, paddingInline: 10 }}>
                Goal: {monthsText(goal)} <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
            <Tip title={formula} placement="left">
              <InfoCircleOutlined aria-label={formula} style={{ opacity: 0.85, cursor: "help" }} />
            </Tip>
          </Flex>
        </Flex>
        {shown === null && <Typography.Text style={{ display: "block", color: "inherit", fontSize: 16, marginTop: 14 }}>Log your expenses to see how many months your money would last.</Typography.Text>}
        <Flex gap={32} wrap style={{ marginTop: 14 }}>
          {shown !== null && <Stat icon={<FieldTimeOutlined />} label="Coverage" value={monthsText(shown)} />}
          <Stat icon={<WalletOutlined />} label="Balance" value={money(balance, currency)} />
          {average > 0 && <Stat icon={<ShoppingOutlined />} label="Average spending" value={`${money(average, currency)}/month`} />}
        </Flex>
        {months !== null && <div style={{ marginTop: 18 }}><GoalMeter months={months} goal={goal} /></div>}
      </div>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, opacity: 0.9 }}><span style={{ marginRight: 6 }}>{icon}</span>{label}</div>
      <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function monthsText(months: number) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(months)} ${months === 1 ? "month" : "months"}`;
}

function GoalMeter({ months, goal }: { months: number; goal: number }) {
  const progress = Math.min(1, months / goal);
  return (
    <div role="meter" aria-label={`Progress toward your ${monthsText(goal)} emergency fund goal`} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(goal, Math.round(months * 10) / 10)} style={{ minWidth: 0 }}>
      <div style={{ position: "relative", height: 8, borderRadius: 999, background: "rgba(0, 0, 0, 0.22)" }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 999, background: "currentColor" }} />
        <span aria-hidden style={{ position: "absolute", left: "50%", top: -3, bottom: -3, width: 2, marginLeft: -1, borderRadius: 1, background: "currentColor", opacity: 0.6 }} />
      </div>
      <Flex justify="space-between" aria-hidden style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>
        <span>0</span>
        <span>{monthsText(goal / 2)}</span>
        <span>{goal}+ months goal</span>
      </Flex>
    </div>
  );
}
