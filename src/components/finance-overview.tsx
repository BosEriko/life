"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Alert, Card, Empty, Flex, Select, Spin, Typography, theme } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useHealthData } from "@/components/health-data-provider";
import { useFinanceHistory } from "@/components/use-health-history";
import { RangeFilter, useDateRange } from "@/components/range-filter";
import { useIsDark } from "@/components/theme-provider";
import { currencyDigits, money } from "@/lib/finance";
import { mergeById } from "@/lib/merge-records";
import { todayKey } from "@/models/users/dailies";

const chartLoading = () => <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex>;
const FinanceMonthChart = dynamic(() => import("@/components/finance-month-chart").then((mod) => mod.FinanceMonthChart), { ssr: false, loading: chartLoading });
const NetLineChart = dynamic(() => import("@/components/finance-overview-charts").then((mod) => mod.NetLineChart), { ssr: false, loading: chartLoading });
const CategoryDonut = dynamic(() => import("@/components/finance-overview-charts").then((mod) => mod.CategoryDonut), { ssr: false, loading: chartLoading });

const INCOME = { light: "#0f9488", dark: "#28a0a0" };
const EXPENSE = { light: "#a8502c", dark: "#d4643a" };
const SLOT_CATEGORIES = ["Food & drink", "Shopping", "Housing", "Transportation", "Health", "Entertainment", "Education", "Bills"];
const SLOTS = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};
const OTHER = { light: "#8f8e88", dark: "#6f6e69" };

type Bucket = { key: string; label: string; start: Dayjs; end: Dayjs };

function buckets(start: Dayjs, end: Dayjs): Bucket[] {
  const days = end.diff(start, "day") + 1;
  const unit = days <= 31 ? "day" : days <= 120 ? "week" : "month";
  const format = unit === "month" ? "MMM YY" : "MMM D";
  const out: Bucket[] = [];
  for (let cursor = start.startOf(unit); !cursor.isAfter(end, "day"); cursor = cursor.add(1, unit)) {
    const bucketEnd = cursor.endOf(unit);
    out.push({ key: cursor.format("YYYY-MM-DD"), label: cursor.format(format), start: cursor, end: bucketEnd });
  }
  return out;
}

export function FinanceOverview() {
  const { token } = theme.useToken();
  const isDark = useIsDark();
  const mode = isDark ? "dark" : "light";
  const { financeAccounts, financeRecords, cutoff } = useHealthData();
  const [range, setRange] = useDateRange();
  const [currencyChoice, setCurrencyChoice] = useState<string | null>(null);
  const [rangeStart, rangeEnd] = range;
  const needHistory = rangeStart === null || rangeStart.format("YYYY-MM-DD") < cutoff;
  const history = useFinanceHistory(needHistory, cutoff);

  const included = financeAccounts.filter((account) => !account.deletedAt && !account.excludeFromStatistics);
  const accountById = new Map(included.map((account) => [account.id, account]));
  const all = mergeById(financeRecords, needHistory ? history.rows : []).filter((record) => record.type !== "transfer" && accountById.has(record.accountId));

  const counts = new Map<string, number>();
  for (const record of all) counts.set(record.currency, (counts.get(record.currency) ?? 0) + 1);
  const currencies = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
  const currency = currencyChoice && currencies.includes(currencyChoice) ? currencyChoice : currencies[0] ?? included[0]?.currency ?? "PHP";

  const inCurrency = all.filter((record) => record.currency === currency);
  const today = dayjs(todayKey());
  const earliest = inCurrency.reduce((min, record) => (record.date < min ? record.date : min), today.format("YYYY-MM-DD"));
  const start = rangeStart ?? dayjs(earliest);
  const end = rangeEnd;
  const startKey = start.format("YYYY-MM-DD");
  const endKey = end.format("YYYY-MM-DD");
  const records = inCurrency.filter((record) => record.date >= startKey && record.date <= endKey);

  const scale = 10 ** currencyDigits(currency);
  const income = records.filter((record) => record.type === "income").reduce((sum, record) => sum + record.amountMinor, 0);
  const expense = records.filter((record) => record.type === "expense").reduce((sum, record) => sum + record.amountMinor, 0);
  const net = income - expense;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : null;

  const periods = buckets(start, end);
  const flow = periods.flatMap((bucket) => {
    const rows = records.filter((record) => record.date >= bucket.key && record.date <= bucket.end.format("YYYY-MM-DD"));
    return [
      { month: bucket.label, type: "Income" as const, value: rows.filter((record) => record.type === "income").reduce((sum, record) => sum + record.amountMinor, 0) / scale },
      { month: bucket.label, type: "Expenses" as const, value: rows.filter((record) => record.type === "expense").reduce((sum, record) => sum + record.amountMinor, 0) / scale },
    ];
  });
  const netLine = periods.map((bucket, index) => {
    const total = flow.slice(0, (index + 1) * 2).reduce((sum, point) => sum + (point.type === "Income" ? point.value : -point.value), 0);
    return { label: bucket.label, value: Math.round(total * scale) / scale };
  });

  const expenses = records.filter((record) => record.type === "expense");
  const byCategory = new Map<string, number>();
  for (const record of expenses) {
    const key = SLOT_CATEGORIES.includes(record.category) ? record.category : "Other";
    byCategory.set(key, (byCategory.get(key) ?? 0) + record.amountMinor);
  }
  const donutDomain = [...SLOT_CATEGORIES, "Other"];
  const donutRange = [...SLOTS[mode], OTHER[mode]];
  const donutData = donutDomain.filter((category) => byCategory.has(category)).map((category) => ({ category, value: (byCategory.get(category) ?? 0) / scale, minor: byCategory.get(category) ?? 0 }));

  const byAccount = new Map<string, number>();
  for (const record of expenses) byAccount.set(record.accountId, (byAccount.get(record.accountId) ?? 0) + record.amountMinor);
  const accountRows = [...byAccount.entries()].sort((a, b) => b[1] - a[1]);
  const topAccount = accountRows[0]?.[1] ?? 0;

  const topExpenses = [...expenses].sort((a, b) => b.amountMinor - a.amountMinor).slice(0, 5);

  const incomeColor = INCOME[mode];
  const expenseColor = EXPENSE[mode];
  const cardStyle = { minWidth: 0, boxShadow: token.boxShadowTertiary };
  const empty = (text: string) => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} />;
  const card = (title: string, body: ReactNode, note?: string) => (
    <Card styles={{ body: { padding: 20 } }} style={cardStyle}>
      <Typography.Text style={{ display: "block", fontSize: 16 }}>{title}</Typography.Text>
      {note ? <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>{note}</Typography.Text> : null}
      <div style={{ marginTop: 12 }}>{body}</div>
    </Card>
  );
  const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%");

  return (
    <section aria-label="Finance analytics" style={{ marginTop: 32 }}>
      <Flex align="center" justify="space-between" gap={12} wrap style={{ marginBottom: 16 }}>
        <Typography.Title level={2} style={{ fontSize: 18, margin: 0 }}>Analytics</Typography.Title>
        <Flex align="center" gap={10} wrap justify="flex-end">
          <RangeFilter range={range} onChange={setRange} ariaLabel="Finance date range" />
          {currencies.length > 1 && <Select aria-label="Analytics currency" value={currency} onChange={setCurrencyChoice} options={currencies.map((value) => ({ value, label: value }))} style={{ width: 100 }} />}
        </Flex>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
        {start.format("MMM D, YYYY")} – {end.format("MMM D, YYYY")} · {currency} · Transfers and excluded accounts aren’t counted
      </Typography.Paragraph>
      {needHistory && history.error && <Alert type="warning" title="Older records could not be loaded, so this range may be incomplete." style={{ marginBottom: 16 }} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 16 }}>
        {card("Cash flow", records.length === 0 ? empty("No income or expenses in this range.") : <FinanceMonthChart data={flow} currency={currency} colors={[incomeColor, expenseColor]} isDark={isDark} />, "Income vs expenses")}

        {card("Net over time", records.length === 0 ? empty("No income or expenses in this range.") : <NetLineChart data={netLine} currency={currency} color={net < 0 ? expenseColor : incomeColor} isDark={isDark} />, `Running income minus expenses · ${net < 0 ? "−" : ""}${money(Math.abs(net), currency)} overall`)}

        {card("Spending by category", donutData.length === 0 ? empty("No expenses in this range.") : (
          <Flex gap={16} align="center" wrap>
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              <CategoryDonut data={donutData} currency={currency} domain={donutDomain} range={donutRange} isDark={isDark} />
            </div>
            <Flex vertical gap={6} style={{ flex: "1 1 140px", minWidth: 0 }}>
              {donutData.map((row) => (
                <Flex key={row.category} align="center" gap={8} style={{ fontSize: 12 }}>
                  <span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: donutRange[donutDomain.indexOf(row.category)] }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.category}</span>
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{pct(row.minor, expense)}</Typography.Text>
                </Flex>
              ))}
            </Flex>
          </Flex>
        ), money(expense, currency))}

        {card("Spending by account", accountRows.length === 0 ? empty("No expenses in this range.") : (
          <Flex vertical gap={12}>
            {accountRows.map(([id, amount]) => {
              const account = accountById.get(id);
              return (
                <div key={id}>
                  <Flex justify="space-between" gap={12} style={{ marginBottom: 4, fontSize: 13 }}>
                    <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{account?.name ?? "Unknown account"}</span>
                    <span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{money(amount, currency)}</span>
                  </Flex>
                  <div aria-hidden style={{ height: 8, borderRadius: 4, background: token.colorFillSecondary, overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(2, (amount / topAccount) * 100)}%`, height: "100%", borderRadius: 4, background: account?.color ?? expenseColor }} />
                  </div>
                </div>
              );
            })}
          </Flex>
        ))}

        {card("Top expenses", topExpenses.length === 0 ? empty("No expenses in this range.") : (
          <Flex vertical>
            {topExpenses.map((record, index) => (
              <Flex key={record.id} justify="space-between" align="center" gap={12} style={{ padding: "10px 0", borderTop: index ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
                <div style={{ minWidth: 0 }}>
                  <Typography.Text style={{ display: "block", overflowWrap: "anywhere" }}>{record.description || record.category}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{record.category} · {dayjs(record.occurredAt).format("MMM D")}</Typography.Text>
                </div>
                <Typography.Text strong style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{money(record.amountMinor, currency)}</Typography.Text>
              </Flex>
            ))}
          </Flex>
        ))}

        {card("Savings rate", income === 0 && expense === 0 ? empty("No income or expenses in this range.") : (
          <div>
            <div style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{savingsRate === null ? "—" : `${savingsRate}%`}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{savingsRate === null ? "No income in this range" : savingsRate < 0 ? "Spent more than earned" : "of income kept"}</Typography.Text>
            <div aria-hidden style={{ height: 10, borderRadius: 5, background: token.colorFillSecondary, overflow: "hidden", margin: "14px 0 16px" }}>
              <div style={{ width: `${Math.min(100, Math.max(0, savingsRate ?? 0))}%`, height: "100%", borderRadius: 5, background: incomeColor }} />
            </div>
            <Flex vertical gap={6} style={{ fontSize: 13 }}>
              <Flex justify="space-between"><span>Income</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{money(income, currency)}</span></Flex>
              <Flex justify="space-between"><span>Expenses</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{money(expense, currency)}</span></Flex>
              <Flex justify="space-between" style={{ fontWeight: 700 }}><span>Net</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{net < 0 ? "−" : ""}{money(Math.abs(net), currency)}</span></Flex>
            </Flex>
          </div>
        ))}
      </div>
      {needHistory && !history.ready && !history.error && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 12 }}>Loading older records…</Typography.Text>}
    </section>
  );
}
