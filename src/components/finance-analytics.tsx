"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Alert, Button, Card, Empty, Flex, Grid, Select, Spin, Typography, theme } from "antd";
import Link from "next/link";
import dayjs from "dayjs";
import { useHealthData } from "@/components/health-data-provider";
import { useFinanceHistory } from "@/components/use-health-history";
import { PageHeading } from "@/components/page-heading";
import { useIsDark } from "@/components/theme-provider";
import { currencyDigits, money } from "@/lib/finance";
import { mergeById } from "@/lib/merge-records";
import type { MonthPoint } from "@/components/finance-month-chart";
import { CategoryIcon } from "@/components/finance-category-icon";
import { EmptyState } from "@/components/empty-state";

const FinanceMonthChart = dynamic(() => import("@/components/finance-month-chart").then((mod) => mod.FinanceMonthChart), {
  ssr: false,
  loading: () => <Flex justify="center" style={{ padding: 48 }}><Spin /></Flex>,
});

const PERIODS = [
  { value: "1", label: "This month" },
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

const INCOME = { light: "#0f9488", dark: "#28a0a0" };
const EXPENSE = { light: "#a8502c", dark: "#d4643a" };

export function FinanceAnalytics() {
  const { token } = theme.useToken();
  const isDark = useIsDark();
  const screens = Grid.useBreakpoint();
  const { financeAccounts, financeRecords, financeReady, financeError, cutoff } = useHealthData();
  const history = useFinanceHistory(true, cutoff);
  const [period, setPeriod] = useState("6");
  const [currencyChoice, setCurrencyChoice] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("all");

  const included = financeAccounts.filter((account) => !account.deletedAt && !account.excludeFromStatistics);
  const includedIds = new Set(included.map((account) => account.id));
  const records = mergeById(financeRecords, history.rows).filter((record) => record.type !== "transfer" && includedIds.has(record.accountId));

  const currencyCounts = new Map<string, number>();
  for (const record of records) currencyCounts.set(record.currency, (currencyCounts.get(record.currency) ?? 0) + 1);
  const currencies = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
  const currency = currencyChoice && currencies.includes(currencyChoice) ? currencyChoice : currencies[0] ?? included[0]?.currency ?? "PHP";
  const currencyAccounts = included.filter((account) => account.currency === currency);
  const selectedAccount = accountId !== "all" && currencyAccounts.some((account) => account.id === accountId) ? accountId : "all";

  const thisMonth = dayjs().startOf("month");
  const scoped = records.filter((record) => record.currency === currency && (selectedAccount === "all" || record.accountId === selectedAccount));
  const earliest = scoped.reduce((min, record) => (record.date < min ? record.date : min), thisMonth.format("YYYY-MM-DD"));
  const start = period === "all" ? dayjs(earliest).startOf("month") : thisMonth.subtract(Number(period) - 1, "month");
  const inPeriod = scoped.filter((record) => !dayjs(record.date).isBefore(start, "day"));

  const income = inPeriod.filter((record) => record.type === "income").reduce((sum, record) => sum + record.amountMinor, 0);
  const expense = inPeriod.filter((record) => record.type === "expense").reduce((sum, record) => sum + record.amountMinor, 0);
  const net = income - expense;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : null;

  const scale = 10 ** currencyDigits(currency);
  const months: MonthPoint[] = [];
  for (let month = start; !month.isAfter(thisMonth, "month"); month = month.add(1, "month")) {
    const key = month.format("YYYY-MM");
    const rows = inPeriod.filter((record) => record.date.startsWith(key));
    const label = month.format(period === "all" || Number(period) > 6 ? "MMM YY" : "MMM");
    months.push({ month: label, type: "Income", value: rows.filter((record) => record.type === "income").reduce((sum, record) => sum + record.amountMinor, 0) / scale });
    months.push({ month: label, type: "Expenses", value: rows.filter((record) => record.type === "expense").reduce((sum, record) => sum + record.amountMinor, 0) / scale });
  }

  const byCategory = new Map<string, number>();
  for (const record of inPeriod) if (record.type === "expense") byCategory.set(record.category, (byCategory.get(record.category) ?? 0) + record.amountMinor);
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const largest = categories[0]?.[1] ?? 0;

  const incomeColor = isDark ? INCOME.dark : INCOME.light;
  const expenseColor = isDark ? EXPENSE.dark : EXPENSE.light;
  const card = { minWidth: 0, boxShadow: token.boxShadowTertiary };
  const field = (label: string, control: React.ReactNode) => (
    <div>
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>{label}</Typography.Text>
      {control}
    </div>
  );
  const tile = (label: string, value: string, color?: string) => (
    <Card key={label} size="small" style={card}>
      <Typography.Text type="secondary" strong style={{ fontSize: 12 }}>{label}</Typography.Text>
      <div style={{ fontSize: 22, marginTop: 8, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", color }}>{value}</div>
    </Card>
  );

  return (
    <div style={{ minWidth: 0, paddingRight: screens.md === true ? 56 : 0 }}>
      <PageHeading title="Analytics" subtitle="Where your money comes from and where it goes. Transfers and excluded accounts aren’t counted." />
      {financeError && <Alert type="error" title="Could not load your finance data. Reload to try again." style={{ marginBottom: 24 }} />}
      {history.error && <Alert type="warning" title="Older records could not be loaded, so long periods may be incomplete." style={{ marginBottom: 16 }} />}
      {!financeReady ? <Spin /> : (
        <div style={{ display: "grid", gridTemplateColumns: screens.lg === true ? "230px minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
          <Card title="Filters" size="small" style={card}>
            <Flex vertical gap={12}>
              {field("Period", <Select aria-label="Analytics period" value={period} onChange={setPeriod} options={PERIODS} style={{ width: "100%" }} />)}
              {field("Currency", <Select aria-label="Analytics currency" value={currency} onChange={(value) => { setCurrencyChoice(value); setAccountId("all"); }} options={(currencies.length ? currencies : [currency]).map((value) => ({ value, label: value }))} style={{ width: "100%" }} />)}
              {field("Account", <Select aria-label="Analytics account" value={selectedAccount} onChange={setAccountId} options={[{ value: "all", label: "All accounts" }, ...currencyAccounts.map((account) => ({ value: account.id, label: account.name }))]} style={{ width: "100%" }} />)}
            </Flex>
          </Card>

          <Flex vertical gap={16} style={{ minWidth: 0 }}>
            {history.ready && financeRecords.length === 0 && history.rows.length === 0 && <Card styles={{ body: { padding: 24 } }} style={card}><EmptyState title="Your money, in perspective" description="Add records to reveal your spending and savings." action={<Link href="/finance/records"><Button type="primary">Go to Records</Button></Link>} /></Card>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 12 }}>
              {tile("Income", money(income, currency), incomeColor)}
              {tile("Expenses", money(expense, currency), expenseColor)}
              {tile("Net", `${net < 0 ? "−" : ""}${money(Math.abs(net), currency)}`)}
              {tile("Savings rate", savingsRate === null ? "—" : `${savingsRate}%`)}
            </div>

            <Card styles={{ body: { padding: 20 } }} style={card}>
              <Typography.Text style={{ display: "block", fontSize: 17, marginBottom: 8 }}>Income vs expenses by month</Typography.Text>
              {inPeriod.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No income or expenses in this period." /> : (
                <FinanceMonthChart data={months} currency={currency} colors={[incomeColor, expenseColor]} isDark={isDark} />
              )}
            </Card>

            <Card styles={{ body: { padding: 20 } }} style={card}>
              <Typography.Text style={{ display: "block", fontSize: 17, marginBottom: 16 }}>Expenses by category</Typography.Text>
              {categories.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No expenses in this period." /> : (
                <Flex vertical gap={14}>
                  {categories.map(([category, amount]) => (
                    <div key={category}>
                      <Flex justify="space-between" gap={12} style={{ marginBottom: 6 }}>
                        <Typography.Text style={{ minWidth: 0, overflowWrap: "anywhere" }}><CategoryIcon category={category} style={{ marginRight: 6 }} />{category}</Typography.Text>
                        <Typography.Text style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {money(amount, currency)} <Typography.Text type="secondary">· {Math.round((amount / expense) * 100)}%</Typography.Text>
                        </Typography.Text>
                      </Flex>
                      <div aria-hidden style={{ height: 8, borderRadius: 4, background: token.colorFillSecondary, overflow: "hidden" }}>
                        <div style={{ width: `${Math.max(2, (amount / largest) * 100)}%`, height: "100%", borderRadius: 4, background: expenseColor }} />
                      </div>
                    </div>
                  ))}
                </Flex>
              )}
            </Card>
            {!history.ready && !history.error && <Typography.Text type="secondary" style={{ fontSize: 12 }}>Loading older records…</Typography.Text>}
          </Flex>
        </div>
      )}
    </div>
  );
}
