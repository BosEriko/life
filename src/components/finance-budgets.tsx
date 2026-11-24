"use client";

import { useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { Alert, App, Button, Card, ColorPicker, Empty, Flex, Form, Grid, InputNumber, Input, Segmented, Select, Spin, Switch, Tag, Typography, theme } from "antd";
import { EditOutlined, HolderOutlined, LeftOutlined, LockOutlined, PlusOutlined, RightOutlined, TransactionOutlined, UnlockOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useFinanceHistory } from "@/components/use-health-history";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { EmergencyFundBanner } from "@/components/emergency-fund-banner";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { SortableList } from "@/components/sortable-list";
import { Tip } from "@/components/tip";
import { useIsDark } from "@/components/theme-provider";
import { CategoryBadge } from "@/components/finance-category-icon";
import { CategoryMultiSelect } from "@/components/finance-category-select";
import { FinanceIconPicker } from "@/components/finance-icon-picker";
import { FinanceEntryRow } from "@/components/finance-entry-row";
import { LabelMultiSelect, LabelTags } from "@/components/finance-label-select";
import { LABEL_COLORS, recordLabels, type FinanceLabel } from "@/lib/finance-labels";
import { FinanceRecordModal, accountOption } from "@/components/finance-record-modal";
import { CURRENCIES, currencyDigits, isDebtAccount, money, sortAccounts, type FinanceAccount, type FinanceRecord } from "@/lib/finance";
import { categoryPath, mainCategory, resolveCategory, type FinanceCategory } from "@/lib/finance-categories";
import { BUDGET_PERIOD_LABELS, BUDGET_PERIODS, budgetPeriodBounds, budgetProgress, budgetRecords, budgetValidation, type BudgetPeriod, type BudgetScope, type BudgetStatus, type FinanceBudget } from "@/lib/finance-budgets";
import { mergeById } from "@/lib/merge-records";
import { deleteFinanceBudget, deleteFinanceRecord, reorderFinanceBudgets, saveFinanceBudget, setFinanceBudgetsLocked } from "@/models/users/finance";
import { todayKey } from "@/models/users/dailies";

const BudgetPaceChart = dynamic(() => import("@/components/finance-overview-charts").then((mod) => mod.BudgetPaceChart), { ssr: false, loading: () => <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex> });

const STATUS_LABELS: Record<BudgetStatus, string> = { "on-track": "On track", "at-risk": "At risk", over: "Over budget", under: "Within budget" };

function useBudgetScope(): BudgetScope {
  const { financeCategories, financeAccounts } = useHealthData();
  return {
    categoryIdsOf: (id: string) => {
      const category = resolveCategory(financeCategories, id);
      return [category.id, mainCategory(financeCategories, category).id];
    },
    defaultAccountIds: new Set(financeAccounts.filter((account) => !account.deletedAt && !account.excludeFromStatistics && !isDebtAccount(account)).map((account) => account.id)),
  };
}

function useStatusColor() {
  const { token } = theme.useToken();
  return (status: BudgetStatus) => (status === "over" ? token.colorError : status === "at-risk" ? token.colorWarning : token.colorSuccess);
}

function periodLabel(period: BudgetPeriod, start: string, end: string) {
  if (period === "daily") return dayjs(start).format("MMM D, YYYY");
  if (period === "weekly") return `${dayjs(start).format("MMM D")} – ${dayjs(end).format("MMM D, YYYY")}`;
  if (period === "monthly") return dayjs(start).format("MMMM YYYY");
  return dayjs(start).format("YYYY");
}

function budgetSummary(budget: FinanceBudget, categories: FinanceCategory[], accounts: FinanceAccount[], labels: FinanceLabel[]) {
  const names = budget.categoryIds.map((id) => categories.find((category) => category.id === id)).filter((category): category is FinanceCategory => !!category).map((category) => categoryPath(categories, category));
  const accountNames = budget.accountIds.map((id) => accounts.find((account) => account.id === id && !account.deletedAt)?.name).filter((name): name is string => !!name);
  const list = (items: string[], all: string) => (items.length === 0 ? all : items.length <= 2 ? items.join(", ") : `${items.slice(0, 2).join(", ")} +${items.length - 2}`);
  return [list(names, "All categories"), list(accountNames, "All accounts"), ...(recordLabels(labels, budget.labels).length ? [list(recordLabels(labels, budget.labels).map((label) => label.name), "")] : []), budget.currency].join(" · ");
}

function ProgressBar({ ratio, expected, color, height = 10 }: { ratio: number; expected?: number; color: string; height?: number }) {
  const { token } = theme.useToken();
  return (
    <div aria-hidden style={{ position: "relative", height, borderRadius: height / 2, background: token.colorFillSecondary }}>
      <div style={{ width: `${Math.min(100, Math.max(ratio > 0 ? 2 : 0, ratio * 100))}%`, height: "100%", borderRadius: height / 2, background: color }} />
      {expected !== undefined && <div title="Where you should be today" style={{ position: "absolute", top: -3, bottom: -3, left: `calc(${Math.min(100, expected * 100)}% - 1px)`, width: 2, borderRadius: 1, background: token.colorText }} />}
    </div>
  );
}

function PaceLine({ budget, progress, compact = false }: { budget: FinanceBudget; progress: ReturnType<typeof budgetProgress>; compact?: boolean }) {
  const fontSize = compact ? 12 : 13;
  if (progress.past) return <Typography.Text type="secondary" style={{ fontSize }}>{progress.leftMinor >= 0 ? `Finished ${money(progress.leftMinor, budget.currency)} under` : `Went ${money(-progress.leftMinor, budget.currency)} over`}</Typography.Text>;
  if (progress.leftMinor < 0) return <Typography.Text type="danger" style={{ fontSize }}>Over by {money(-progress.leftMinor, budget.currency)}</Typography.Text>;
  if (progress.leftMinor === 0) return <Typography.Text type="secondary" style={{ fontSize }}>No budget left</Typography.Text>;
  const allowance = budget.period === "daily" ? `${money(progress.leftMinor, budget.currency)} left today` : `${money(progress.dailyAllowanceMinor, budget.currency)}/day for the next ${progress.daysLeft} ${progress.daysLeft === 1 ? "day" : "days"}`;
  return (
    <Flex vertical gap={2}>
      <Typography.Text strong style={{ fontSize }}>{allowance}</Typography.Text>
      {progress.paced && <Typography.Text type="secondary" style={{ fontSize: 12 }}>On pace for {money(progress.projectedMinor, budget.currency)}{progress.early ? " · early estimate" : ""}</Typography.Text>}
    </Flex>
  );
}

function BudgetModal({ initial, onClose }: { initial: FinanceBudget; onClose: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { financeAccounts, financeBudgets } = useHealthData();
  const existing = financeBudgets.some((budget) => budget.id === initial.id);
  const ownAccounts = sortAccounts(financeAccounts.filter((account) => !account.deletedAt && !isDebtAccount(account)));
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [icon, setIcon] = useState(initial.icon);
  const [amount, setAmount] = useState<number | null>(initial.amountMinor ? initial.amountMinor / 10 ** currencyDigits(initial.currency) : null);
  const [period, setPeriod] = useState<BudgetPeriod>(initial.period);
  const [categoryIds, setCategoryIds] = useState(initial.categoryIds);
  const [accountIds, setAccountIds] = useState(initial.accountIds.filter((id) => ownAccounts.some((account) => account.id === id)));
  const [labels, setLabels] = useState(initial.labels);
  const [currencyChoice, setCurrencyChoice] = useState(initial.currency);
  const [fixed, setFixed] = useState(initial.fixed);
  const pickedCurrency = ownAccounts.find((account) => account.id === accountIds[0])?.currency;
  const currency = pickedCurrency ?? currencyChoice;
  const lostFilters = initial.categoryIds.length + initial.accountIds.length > 0 && existing && categoryIds.length + accountIds.length < initial.categoryIds.length + initial.accountIds.length;
  function save() {
    if (!user) return;
    const budget: FinanceBudget = { ...initial, name, color, icon, amountMinor: amount === null ? NaN : Math.round(amount) * 10 ** currencyDigits(currency), currency, period, categoryIds, accountIds, labels, fixed: period !== "daily" && fixed };
    const error = budgetValidation(budget, financeAccounts);
    if (error) { message.error(error); return; }
    void saveFinanceBudget(user.uid, budget, financeAccounts).catch((reason: unknown) => message.error(reason instanceof Error ? reason.message : "Could not save the budget."));
    message.success(navigator.onLine ? (existing ? "Budget updated." : "Budget added.") : "Budget saved offline. It will sync when you reconnect.");
    onClose();
  }
  return <AppModal open title={existing ? "Edit budget" : "Add budget"} onCancel={onClose} footer={<Flex justify="flex-end"><Button type="primary" onClick={save}>{existing ? "Save changes" : "Add budget"}</Button></Flex>}>
    <Form layout="vertical" onFinish={save}>
      {lostFilters && <Alert type="warning" showIcon title="Some categories or accounts in this budget were deleted and have been removed." style={{ marginBottom: 16 }} />}
      <Form.Item label="Name" required><Input aria-label="Budget name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoFocus prefix={<CategoryBadge category={{ color, icon }} />} /></Form.Item>
      <Form.Item label="Period" required><Segmented block value={period} onChange={(value) => setPeriod(value as BudgetPeriod)} options={BUDGET_PERIODS.map((value) => ({ value, label: BUDGET_PERIOD_LABELS[value] }))} /></Form.Item>
      <Form.Item label="Amount" required><InputNumber aria-label="Budget amount" value={amount} onChange={setAmount} min={1} precision={0} style={{ width: "100%" }} suffix={currency} /></Form.Item>
      <Form.Item label="Categories" extra="Leave empty to count every category. Picking a main category includes its subcategories."><CategoryMultiSelect ariaLabel="Budget categories" value={categoryIds} onChange={setCategoryIds} placeholder="All categories" /></Form.Item>
      <Form.Item label="Accounts" extra={accountIds.length ? "Only these accounts count." : "Leave empty to count every account included in statistics."}>
        <Select mode="multiple" aria-label="Budget accounts" value={accountIds} onChange={setAccountIds} placeholder="All accounts" allowClear optionFilterProp="search" options={ownAccounts.filter((account) => !pickedCurrency || account.currency === pickedCurrency).map((account) => ({ value: account.id, search: account.name, label: accountOption(account) }))} />
      </Form.Item>
      <Form.Item label="Labels" extra="Leave empty to ignore labels. Records with any of these labels count."><LabelMultiSelect ariaLabel="Budget labels" value={labels} onChange={setLabels} placeholder="Any labels" /></Form.Item>
      <Form.Item label="Currency" required extra={pickedCurrency ? "Set by the accounts you picked." : undefined}><Select aria-label="Budget currency" showSearch value={currency} disabled={!!pickedCurrency} onChange={setCurrencyChoice} options={CURRENCIES.map((value) => ({ value, label: value }))} /></Form.Item>
      {period !== "daily" && <Form.Item label="Fixed expense" extra="For one payment per period, like rent. Skips pace tracking."><Switch aria-label="Fixed expense" checked={fixed} onChange={setFixed} /></Form.Item>}
      <Form.Item label="Color" required><ColorPicker aria-label="Budget color" value={color} disabledAlpha showText onChangeComplete={(value) => setColor(value.toHexString().toUpperCase())} presets={[{ label: "Colors", colors: LABEL_COLORS }]} /></Form.Item>
      <Form.Item label="Icon" required style={{ marginBottom: 0 }}><FinanceIconPicker value={icon} color={color} onChange={setIcon} /></Form.Item>
    </Form>
  </AppModal>;
}

function BudgetRecordsModal({ budget, onClose }: { budget: FinanceBudget; onClose: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const isDark = useIsDark();
  const statusColor = useStatusColor();
  const { financeRecords, financeCategories, financeAccounts, cutoff } = useHealthData();
  const scope = useBudgetScope();
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<FinanceRecord | null>(null);
  const today = todayKey();
  const { start, end } = budgetPeriodBounds(budget.period, today, offset);
  const needHistory = start < cutoff;
  const history = useFinanceHistory(needHistory, cutoff);
  const records = budgetRecords(budget, mergeById(financeRecords, needHistory ? history.rows : []), start, end, scope).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id));
  const spent = records.reduce((sum, record) => sum + record.amountMinor, 0);
  const progress = budgetProgress(budget, spent, start, end, today, 10 ** currencyDigits(budget.currency));
  const scale = 10 ** currencyDigits(budget.currency);
  const accountNames = new Map(financeAccounts.map((account) => [account.id, account.name]));
  const chartEnd = progress.current ? today : end;
  const chart: { label: string; value: number; series: string }[] = [];
  if (budget.period !== "daily") {
    let running = 0;
    const byDay = new Map<string, number>();
    for (const record of records) byDay.set(record.date, (byDay.get(record.date) ?? 0) + record.amountMinor);
    for (let index = 0; index < progress.total; index += 1) {
      const day = dayjs(start).add(index, "day");
      const key = day.format("YYYY-MM-DD");
      const label = day.format("MMM D");
      chart.push({ label, value: Math.round((budget.amountMinor * (index + 1)) / progress.total) / scale, series: "Ideal pace" });
      if (key <= chartEnd) {
        running += byDay.get(key) ?? 0;
        chart.push({ label, value: running / scale, series: "Spent" });
      }
      if (progress.paced && key >= today) chart.push({ label, value: Math.round(spent + ((spent / progress.elapsed) * (index + 1 - progress.elapsed))) / scale, series: "Projected" });
    }
  }
  function remove(record: FinanceRecord) {
    if (!user) return;
    void deleteFinanceRecord(user.uid, record).catch(() => message.error("Could not delete the record."));
    message.success(navigator.onLine ? "Record deleted." : "Deleted offline. It will sync when you reconnect.");
    history.refresh();
  }
  return <>
    <AppModal open title={<Flex align="center" gap={10}><CategoryBadge category={budget} size={26} />{budget.name}</Flex>} onCancel={onClose} footer={null} width={680}>
      <Flex align="center" justify="space-between" gap={8} style={{ marginBottom: 16 }}>
        <Button type="text" icon={<LeftOutlined />} aria-label="Previous period" onClick={() => setOffset(offset - 1)} />
        <Typography.Text strong>{BUDGET_PERIOD_LABELS[budget.period]} · {periodLabel(budget.period, start, end)}</Typography.Text>
        <Button type="text" icon={<RightOutlined />} aria-label="Next period" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} />
      </Flex>
      <Flex align="baseline" justify="space-between" gap={8} wrap style={{ marginBottom: 8 }}>
        <Typography.Text style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(spent, budget.currency)} <Typography.Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>of {money(budget.amountMinor, budget.currency)}</Typography.Text></Typography.Text>
        <Tag color={statusColor(progress.status)} style={{ marginInlineEnd: 0 }}>{STATUS_LABELS[progress.status]}</Tag>
      </Flex>
      <ProgressBar ratio={progress.ratio} expected={progress.paced ? progress.elapsed / progress.total : undefined} color={budget.color} />
      <Flex justify="space-between" align="start" gap={8} wrap style={{ marginTop: 10, marginBottom: 16 }}>
        <PaceLine budget={budget} progress={progress} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{records.length} {records.length === 1 ? "record" : "records"}{needHistory && !history.ready && !history.error ? " · loading older records…" : ""}</Typography.Text>
      </Flex>
      {chart.length > 0 && records.length > 0 && <div style={{ marginBottom: 16 }}><BudgetPaceChart data={chart} currency={budget.currency} colors={[budget.color, token.colorTextTertiary, statusColor(progress.status)]} isDark={isDark} /></div>}
      {needHistory && history.error && <Alert type="warning" title="Older records could not be loaded." action={<Button size="small" onClick={history.refresh}>Retry</Button>} style={{ marginBottom: 16 }} />}
      {records.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No records in this period." /> : <Flex vertical gap={10}>{records.map((record) => {
        const category = resolveCategory(financeCategories, record.category);
        return (
          <div key={record.id} style={{ padding: "14px 16px", borderRadius: token.borderRadius, background: token.colorFillSecondary }}>
            <FinanceEntryRow
              icon={<CategoryBadge category={category} size={20} />}
              title={categoryPath(financeCategories, category)}
              meta={`${accountNames.get(record.accountId) ?? "Unknown account"} · ${dayjs(record.occurredAt).format("MMM D, YYYY · h:mm A")}`}
              amount={`−${money(record.amountMinor, record.currency)}`}
              amountColor={token.colorError}
              actions={<>
                <Button type="text" size="small" icon={<EditOutlined />} aria-label="Edit record" onClick={() => setEditing(record)} />
                <ConfirmDeleteButton ariaLabel="Delete record" tooltip="Delete record" hint="Tap again to delete this record" onConfirm={() => remove(record)} />
              </>}
            >
              {record.description && <Typography.Paragraph style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{record.description}</Typography.Paragraph>}
              <LabelTags ids={record.labels} />
            </FinanceEntryRow>
          </div>
        );
      })}</Flex>}
    </AppModal>
    {editing && <FinanceRecordModal key={editing.id} initial={editing} onClose={() => setEditing(null)} onSaved={history.refresh} />}
  </>;
}

export function FinanceBudgets() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const statusColor = useStatusColor();
  const { financeAccounts, financeRecords, financeCategories, financeBudgets, financeBudgetsLocked: locked, financeLabels, financeReady, financeError } = useHealthData();
  const scope = useBudgetScope();
  const [editing, setEditing] = useState<FinanceBudget | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const today = todayKey();
  const ownAccounts = financeAccounts.filter((account) => !account.deletedAt && !isDebtAccount(account));
  const budgets = [...financeBudgets].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const byId = new Map(budgets.map((budget) => [budget.id, budget]));
  const disabled = !financeReady || financeError;
  const progressOf = (budget: FinanceBudget) => {
    const { start, end } = budgetPeriodBounds(budget.period, today);
    const spent = budgetRecords(budget, financeRecords, start, end, scope).reduce((sum, record) => sum + record.amountMinor, 0);
    return { spent, start, end, progress: budgetProgress(budget, spent, start, end, today, 10 ** currencyDigits(budget.currency)) };
  };
  const states = new Map(budgets.map((budget) => [budget.id, progressOf(budget)]));
  const counts = { "on-track": 0, "at-risk": 0, over: 0 };
  for (const state of states.values()) if (state.progress.status !== "under") counts[state.progress.status] += 1;
  const currencyCounts = new Map<string, number>();
  for (const account of ownAccounts) currencyCounts.set(account.currency, (currencyCounts.get(account.currency) ?? 0) + 1);
  const defaultCurrency = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "PHP";
  const blank = (): FinanceBudget => ({ id: crypto.randomUUID(), name: "", color: "#F44336", icon: "utensils", amountMinor: 0, currency: defaultCurrency, period: "monthly", categoryIds: [], accountIds: [], labels: [], fixed: false, order: budgets.reduce((max, budget) => Math.max(max, budget.order + 1), 0) });
  const remove = (budget: FinanceBudget) => {
    if (!user) return;
    void deleteFinanceBudget(user.uid, budget.id).catch(() => message.error("Could not delete the budget."));
    message.success(navigator.onLine ? "Budget deleted." : "Deleted offline. It will sync when you reconnect.");
  };
  const reorder = (order: string[]) => {
    if (user) void reorderFinanceBudgets(user.uid, order).catch(() => message.error("Could not save the new order."));
  };
  const openBudget = openId ? byId.get(openId) ?? null : null;

  const cardBody = (budget: FinanceBudget) => {
    const state = states.get(budget.id)!;
    const { progress } = state;
    return (
      <Flex vertical gap={10}>
        <Flex align="start" gap={10}>
          {!locked && <HolderOutlined aria-hidden style={{ color: token.colorTextTertiary, alignSelf: "flex-start", marginTop: 4, marginLeft: -2, fontSize: 13 }} />}
          <CategoryBadge category={budget} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Typography.Text strong style={{ display: "block", overflowWrap: "anywhere" }}>{budget.name}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12, overflowWrap: "anywhere" }}>{BUDGET_PERIOD_LABELS[budget.period]}{budget.fixed ? " · Fixed" : ""} · {budgetSummary(budget, financeCategories, financeAccounts, financeLabels)}</Typography.Text>
          </div>
          <Flex gap={2} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            <Tip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} aria-label={`Edit ${budget.name}`} disabled={disabled} onClick={() => setEditing(budget)} /></Tip>
            <ConfirmDeleteButton ariaLabel={`Delete ${budget.name}`} tooltip="Delete budget" hint="Tap again to delete this budget. Records are kept." onConfirm={() => remove(budget)} />
          </Flex>
        </Flex>
        <Flex align="baseline" justify="space-between" gap={8} wrap>
          <Typography.Text style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(state.spent, budget.currency)} <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>of {money(budget.amountMinor, budget.currency)}</Typography.Text></Typography.Text>
          <Tag color={statusColor(progress.status)} style={{ marginInlineEnd: 0 }}>{STATUS_LABELS[progress.status]}</Tag>
        </Flex>
        <ProgressBar ratio={progress.ratio} expected={progress.paced ? progress.elapsed / progress.total : undefined} color={budget.color} />
        <Flex justify="space-between" align="start" gap={8} wrap>
          <PaceLine budget={budget} progress={progress} compact />
          {budget.period !== "daily" && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{progress.daysLeft} {progress.daysLeft === 1 ? "day" : "days"} left</Typography.Text>}
        </Flex>
      </Flex>
    );
  };

  return (
    <div style={{ minWidth: 0 }}>
      <PageHeading title="Budgets" subtitle="Spending limits for what matters, and whether you're on pace to stay within them." extra={<>
        <Button icon={<TransactionOutlined />} disabled={disabled || ownAccounts.length === 0} onClick={() => setRecordOpen(true)}>Add record</Button>
        <Button type="primary" icon={<PlusOutlined />} disabled={disabled} onClick={() => setEditing(blank())}>Add budget</Button>
      </>} />
      {financeError && <Alert type="error" title="Could not load your finance data. Reload to try again." style={{ marginBottom: 24 }} />}
      {!financeReady ? <Spin /> : <>
        <EmergencyFundBanner />
        {budgets.length === 0 ? <Card><EmptyState title="No budgets yet" description="Set a spending limit, like ₱10,000 a month for food, and see if you're on pace to stay within it." action={<Button type="primary" icon={<PlusOutlined />} disabled={disabled} onClick={() => setEditing(blank())}>Add budget</Button>} /></Card> : <>
          <Flex align="center" justify="space-between" gap={12} wrap style={{ marginBottom: 16 }}>
            <Flex gap={8} wrap>
              <Tag color={statusColor("on-track")} style={{ marginInlineEnd: 0 }}>{counts["on-track"]} on track</Tag>
              <Tag color={statusColor("at-risk")} style={{ marginInlineEnd: 0 }}>{counts["at-risk"]} at risk</Tag>
              <Tag color={statusColor("over")} style={{ marginInlineEnd: 0 }}>{counts.over} over budget</Tag>
            </Flex>
            {budgets.length > 1 && <Tip title={locked ? "Unlock to reorder budgets" : "Lock budget order"}>
              <Button type="text" size="small" aria-label={locked ? "Unlock budget order" : "Lock budget order"} aria-pressed={locked} icon={locked ? <LockOutlined /> : <UnlockOutlined />} disabled={disabled}
                onClick={() => { if (user) void setFinanceBudgetsLocked(user.uid, !locked).catch(() => message.error("Could not update the lock.")); }}
                style={{ color: locked ? token.colorPrimary : token.colorTextSecondary }} />
            </Tip>}
          </Flex>
          <div style={{ display: "grid", gridTemplateColumns: screens.sm === false ? "minmax(0, 1fr)" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            <SortableList
              ids={budgets.map((budget) => budget.id)}
              layout="grid"
              disabled={disabled || locked}
              onReorder={reorder}
              renderOverlay={(id) => { const budget = byId.get(id); return budget ? <Card size="small" style={{ boxShadow: token.boxShadowSecondary }}>{cardBody(budget)}</Card> : null; }}
              renderItem={(id, { ref, style, handlers, wasDragged }) => {
                const budget = byId.get(id);
                if (!budget) return null;
                return (
                  <Card key={id} ref={ref} size="small" {...handlers} className="reorder-item budget-card" role="button" tabIndex={0} aria-label={`${budget.name} budget. Press Enter to see records${locked ? "" : ", or Space to pick up and reorder"}.`}
                    onClick={() => { if (!wasDragged()) setOpenId(budget.id); }}
                    onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setOpenId(budget.id); } else handlers.onKeyDown?.(event); }}
                    style={{ ...style, minWidth: 0, cursor: "pointer", boxShadow: token.boxShadowTertiary, "--card-accent": budget.color } as CSSProperties}>
                    {cardBody(budget)}
                  </Card>
                );
              }}
            />
          </div>
        </>}
      </>}
      {editing && <BudgetModal key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
      {openBudget && <BudgetRecordsModal key={openBudget.id} budget={openBudget} onClose={() => setOpenId(null)} />}
      {recordOpen && <FinanceRecordModal onClose={() => setRecordOpen(false)} onSaved={() => {}} />}
    </div>
  );
}
