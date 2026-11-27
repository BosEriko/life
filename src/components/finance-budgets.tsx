"use client";

import { useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { Alert, App, Button, Card, ColorPicker, Empty, Flex, Form, Grid, InputNumber, Input, Segmented, Select, Spin, Switch, Tag, Typography, theme } from "antd";
import { AppstoreOutlined, CheckCircleOutlined, EditOutlined, ExclamationCircleOutlined, FundOutlined, HolderOutlined, UnorderedListOutlined, LeftOutlined, LockOutlined, PlusOutlined, RightOutlined, TransactionOutlined, UnlockOutlined, WarningOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { useFinanceHistory } from "@/components/use-health-history";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { SortableList } from "@/components/sortable-list";
import { Tip } from "@/components/tip";
import { useIsDark } from "@/components/theme-provider";
import { CategoryBadge, CategoryGlyph } from "@/components/finance-category-icon";
import { CategoryMultiSelect } from "@/components/finance-category-select";
import { FinanceIconPicker } from "@/components/finance-icon-picker";
import { FinanceEntryRow } from "@/components/finance-entry-row";
import { LabelMultiSelect, LabelTags } from "@/components/finance-label-select";
import { LABEL_COLORS, recordLabels, type FinanceLabel } from "@/lib/finance-labels";
import { FinanceRecordModal, accountOption } from "@/components/finance-record-modal";
import { accountTextColor, CURRENCIES, FINANCE_STATUS_COLORS, surfaceColor, currencyDigits, isDebtAccount, money, sortAccounts, type FinanceAccount, type FinanceRecord } from "@/lib/finance";
import { categoryPath, mainCategory, resolveCategory, type FinanceCategory } from "@/lib/finance-categories";
import { BUDGET_PERIOD_LABELS, BUDGET_PERIODS, budgetPeriodBounds, budgetProgress, budgetRecords, budgetValidation, type BudgetPeriod, type BudgetScope, type BudgetStatus, type FinanceBudget } from "@/lib/finance-budgets";
import { mergeById } from "@/lib/merge-records";
import { deleteFinanceBudget, deleteFinanceRecord, reorderFinanceBudgets, saveFinanceBudget, setFinanceBudgetsLocked } from "@/models/users/finance";
import { todayKey } from "@/models/users/dailies";

const BudgetPaceChart = dynamic(() => import("@/components/finance-overview-charts").then((mod) => mod.BudgetPaceChart), { ssr: false, loading: () => <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex> });

const TOTAL_COLORS: Record<BudgetStatus, string> = { "on-track": FINANCE_STATUS_COLORS.good, under: FINANCE_STATUS_COLORS.good, "at-risk": FINANCE_STATUS_COLORS.fair, over: FINANCE_STATUS_COLORS.low };

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

function defaultCurrencyOf(accounts: FinanceAccount[]) {
  const counts = new Map<string, number>();
  for (const account of accounts) counts.set(account.currency, (counts.get(account.currency) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "PHP";
}

function PaceText({ budget, progress }: { budget: FinanceBudget; progress: ReturnType<typeof budgetProgress> }) {
  if (progress.leftMinor < 0) return <>Over by {money(-progress.leftMinor, budget.currency)}</>;
  if (progress.leftMinor === 0) return <>No budget left</>;
  if (budget.period === "daily") return <>{money(progress.leftMinor, budget.currency)} left today</>;
  return <>{money(progress.dailyAllowanceMinor, budget.currency)}/day · {progress.daysLeft} {progress.daysLeft === 1 ? "day" : "days"} left</>;
}

function ProgressBar({ ratio, expected, color, height = 10, solid = false }: { ratio: number; expected?: number; color?: string; height?: number; solid?: boolean }) {
  const { token } = theme.useToken();
  return (
    <div aria-hidden style={{ position: "relative", height, borderRadius: height / 2, background: solid ? "rgba(0, 0, 0, 0.22)" : token.colorFillSecondary }}>
      <div style={{ width: `${Math.min(100, Math.max(ratio > 0 ? 2 : 0, ratio * 100))}%`, height: "100%", borderRadius: height / 2, background: solid ? "currentColor" : color }} />
      {expected !== undefined && <div title="Where you should be today" style={{ position: "absolute", top: -3, bottom: -3, left: `calc(${Math.min(100, expected * 100)}% - 1px)`, width: 2, borderRadius: 1, background: solid ? "currentColor" : token.colorText, opacity: solid ? 0.6 : 1 }} />}
    </div>
  );
}

const PILL_TINTS: Partial<Record<BudgetStatus, string>> = { over: "rgba(255, 77, 79, 0.5)", "at-risk": "rgba(250, 173, 20, 0.5)" };

function StatusPill({ status }: { status: BudgetStatus }) {
  const Icon = status === "over" ? WarningOutlined : status === "at-risk" ? ExclamationCircleOutlined : CheckCircleOutlined;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 10px", borderRadius: 999, background: PILL_TINTS[status] ?? "rgba(0, 0, 0, 0.22)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      <Icon aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}

function PaceLine({ budget, progress, compact = false, solid = false }: { budget: FinanceBudget; progress: ReturnType<typeof budgetProgress>; compact?: boolean; solid?: boolean }) {
  const fontSize = compact ? 12 : 13;
  const muted = solid ? { color: "inherit" } : {};
  const type = solid ? undefined : "secondary" as const;
  if (progress.past) return <Typography.Text type={type} style={{ fontSize, ...muted }}>{progress.leftMinor >= 0 ? `Finished ${money(progress.leftMinor, budget.currency)} under` : `Went ${money(-progress.leftMinor, budget.currency)} over`}</Typography.Text>;
  if (progress.leftMinor < 0) return <Typography.Text type={solid ? undefined : "danger"} strong={solid} style={{ fontSize, ...(solid ? { color: "inherit" } : {}) }}>Over by {money(-progress.leftMinor, budget.currency)}</Typography.Text>;
  if (progress.leftMinor === 0) return <Typography.Text type={type} style={{ fontSize, ...muted }}>No budget left</Typography.Text>;
  const allowance = budget.period === "daily" ? `${money(progress.leftMinor, budget.currency)} left today` : `${money(progress.dailyAllowanceMinor, budget.currency)}/day for the next ${progress.daysLeft} ${progress.daysLeft === 1 ? "day" : "days"}`;
  return (
    <Flex vertical gap={2}>
      <Typography.Text strong style={{ fontSize, ...(solid ? { color: "inherit" } : {}) }}>{allowance}</Typography.Text>
      {progress.paced && <Typography.Text type={type} style={{ fontSize: 12, ...muted }}>On pace for {money(progress.projectedMinor, budget.currency)}{progress.early ? " · early estimate" : ""}</Typography.Text>}
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
        <Tag className="status-tag" color={statusColor(progress.status)} icon={progress.status === "over" ? <WarningOutlined /> : progress.status === "at-risk" ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />} style={{ marginInlineEnd: 0 }}>{STATUS_LABELS[progress.status]}</Tag>
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

const VIEW_KEY = "finance-budgets-view";

function loadView(): "cards" | "list" {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "cards" ? "cards" : "list";
  } catch {
    return "list";
  }
}

function saveView(view: "cards" | "list") {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    return;
  }
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
  const [statusChoice, setStatusChoice] = useState<"on-track" | "at-risk" | "over" | null>(null);
  const [view, setView] = useState<"cards" | "list">(loadView);
  const [totalChoice, setTotalChoice] = useState<string | null>(null);
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
  const groups = new Map<string, FinanceBudget[]>();
  for (const budget of [...budgets].sort((a, b) => BUDGET_PERIODS.indexOf(a.period) - BUDGET_PERIODS.indexOf(b.period) || a.currency.localeCompare(b.currency))) {
    const key = `${budget.period}|${budget.currency}`;
    groups.set(key, [...(groups.get(key) ?? []), budget]);
  }
  const groupKeys = [...groups.keys()];
  const multipleCurrencies = new Set(budgets.map((budget) => budget.currency)).size > 1;
  const totalKey = totalChoice && groups.has(totalChoice) ? totalChoice : groupKeys.find((key) => key.startsWith("monthly|")) ?? groupKeys[0];
  const totalBudgets = totalKey ? groups.get(totalKey)! : [];
  const totalPeriod = totalBudgets[0]?.period ?? "monthly";
  const totalCurrency = totalBudgets[0]?.currency ?? defaultCurrencyOf(ownAccounts);
  const totalBounds = budgetPeriodBounds(totalPeriod, today);
  const totalAmount = totalBudgets.reduce((sum, budget) => sum + budget.amountMinor, 0);
  const totalSpent = totalBudgets.reduce((sum, budget) => sum + (states.get(budget.id)?.spent ?? 0), 0);
  const totalProgress = budgetProgress({ amountMinor: totalAmount, period: totalPeriod, fixed: totalBudgets.every((budget) => budget.fixed) }, totalSpent, totalBounds.start, totalBounds.end, today, 10 ** currencyDigits(totalCurrency));
  const totalBudget = { ...(totalBudgets[0] ?? {}), amountMinor: totalAmount, currency: totalCurrency, period: totalPeriod } as FinanceBudget;
  const counts = { "on-track": 0, "at-risk": 0, over: 0 };
  for (const state of states.values()) if (state.progress.status !== "under") counts[state.progress.status] += 1;
  const statusFilter = statusChoice && counts[statusChoice] ? statusChoice : null;
  const visibleIds = budgets.filter((budget) => !statusFilter || states.get(budget.id)?.progress.status === statusFilter).map((budget) => budget.id);
  const defaultCurrency = defaultCurrencyOf(ownAccounts);
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

  const actions = (budget: FinanceBudget) => (
    <Flex gap={2} className="solid-surface-actions" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <Tip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} aria-label={`Edit ${budget.name}`} disabled={disabled} onClick={() => setEditing(budget)} /></Tip>
      <ConfirmDeleteButton ariaLabel={`Delete ${budget.name}`} tooltip="Delete budget" hint="Tap again to delete this budget. Records are kept." onConfirm={() => remove(budget)} />
    </Flex>
  );

  const muted = { color: "inherit" };
  const surface = (budget: FinanceBudget): CSSProperties => {
    const fill = surfaceColor(budget.color);
    return { position: "relative", overflow: "hidden", background: fill, borderColor: fill, color: accountTextColor(fill), cursor: "pointer" };
  };
  const listBody = (budget: FinanceBudget) => {
    const state = states.get(budget.id)!;
    const { progress } = state;
    return (
      <Flex vertical gap={8}>
        <Flex justify="space-between" align="center" gap={10} wrap>
          <Flex align="center" gap={10} style={{ flex: "1 1 220px", minWidth: 0 }}>
            {!locked && !statusFilter && <HolderOutlined aria-hidden style={{ opacity: 0.7, fontSize: 13 }} />}
            <CategoryGlyph icon={budget.icon} style={{ fontSize: 18, opacity: 0.9, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <Flex align="center" gap={8} wrap>
                <Typography.Text strong style={{ color: "inherit", overflowWrap: "anywhere" }}>{budget.name}</Typography.Text>
                <StatusPill status={progress.status} />
              </Flex>
              <Typography.Text style={{ fontSize: 12, overflowWrap: "anywhere", ...muted }}>{BUDGET_PERIOD_LABELS[budget.period]} · <PaceText budget={budget} progress={progress} /></Typography.Text>
            </div>
          </Flex>
          <Flex align="center" gap={8} style={{ marginLeft: "auto" }}>
            <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}><strong>{money(state.spent, budget.currency)}</strong> <span style={{ fontSize: 12, }}>/ {money(budget.amountMinor, budget.currency)}</span></span>
            {actions(budget)}
          </Flex>
        </Flex>
        <ProgressBar ratio={progress.ratio} expected={progress.paced ? progress.elapsed / progress.total : undefined} height={6} solid />
      </Flex>
    );
  };

  const cardBody = (budget: FinanceBudget) => {
    const state = states.get(budget.id)!;
    const { progress } = state;
    return (
      <>
        <CategoryGlyph icon={budget.icon} style={{ position: "absolute", right: -6, bottom: -10, fontSize: 84, opacity: 0.14, pointerEvents: "none" }} />
        <Flex vertical gap={10} style={{ position: "relative" }}>
          <Flex align="start" gap={10}>
            {!locked && !statusFilter && <HolderOutlined aria-hidden style={{ opacity: 0.7, alignSelf: "flex-start", marginTop: 4, marginLeft: -2, fontSize: 13 }} />}
            <CategoryGlyph icon={budget.icon} style={{ fontSize: 18, marginTop: 2, opacity: 0.9, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography.Text strong style={{ display: "block", color: "inherit", overflowWrap: "anywhere" }}>{budget.name}</Typography.Text>
              <Typography.Text style={{ fontSize: 12, overflowWrap: "anywhere", ...muted }}>{BUDGET_PERIOD_LABELS[budget.period]}{budget.fixed ? " · Fixed" : ""} · {budgetSummary(budget, financeCategories, financeAccounts, financeLabels)}</Typography.Text>
            </div>
            {actions(budget)}
          </Flex>
          <Flex align="baseline" justify="space-between" gap={8} wrap>
            <span style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(state.spent, budget.currency)} <span style={{ fontSize: 13, fontWeight: 400 }}>of {money(budget.amountMinor, budget.currency)}</span></span>
            <StatusPill status={progress.status} />
          </Flex>
          <ProgressBar ratio={progress.ratio} expected={progress.paced ? progress.elapsed / progress.total : undefined} solid />
          <Flex justify="space-between" align="start" gap={8} wrap>
            <PaceLine budget={budget} progress={progress} compact solid />
            {budget.period !== "daily" && <Typography.Text style={{ fontSize: 12, ...muted }}>{progress.daysLeft} {progress.daysLeft === 1 ? "day" : "days"} left</Typography.Text>}
          </Flex>
        </Flex>
      </>
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
        {budgets.length > 0 && <Card size="small" role="status" style={{ marginBottom: 20, position: "relative", overflow: "hidden", background: TOTAL_COLORS[totalProgress.status], borderColor: TOTAL_COLORS[totalProgress.status], color: accountTextColor(TOTAL_COLORS[totalProgress.status]), boxShadow: token.boxShadowTertiary }} styles={{ body: { padding: 20 } }}>
          <FundOutlined aria-hidden style={{ position: "absolute", right: -10, bottom: -13, fontSize: 96, opacity: 0.14, pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
          <Flex align="center" justify="space-between" gap={12} wrap style={{ marginBottom: 12 }}>
            <div>
              <Typography.Text strong style={{ display: "block", fontSize: 16, color: "inherit" }}>{BUDGET_PERIOD_LABELS[totalPeriod]} total{multipleCurrencies ? ` · ${totalCurrency}` : ""}</Typography.Text>
              <Typography.Text style={{ fontSize: 12, ...muted }}>{totalBudgets.length} {totalBudgets.length === 1 ? "budget" : "budgets"} · {periodLabel(totalPeriod, totalBounds.start, totalBounds.end)}</Typography.Text>
            </div>
            {groupKeys.length > 1 && <Segmented size="small" className="solid-surface-segmented" value={totalKey} onChange={(value) => setTotalChoice(value as string)} options={groupKeys.map((key) => { const [period, currency] = key.split("|"); return { value: key, label: `${BUDGET_PERIOD_LABELS[period as BudgetPeriod]}${multipleCurrencies ? ` ${currency}` : ""}` }; })} />}
          </Flex>
          <Flex align="baseline" justify="space-between" gap={8} wrap style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(totalSpent, totalCurrency)} <span style={{ fontSize: 14, fontWeight: 400 }}>of {money(totalAmount, totalCurrency)}</span></span>
            <StatusPill status={totalProgress.status} />
          </Flex>
          <ProgressBar ratio={totalProgress.ratio} expected={totalProgress.paced ? totalProgress.elapsed / totalProgress.total : undefined} height={12} solid />
          <Flex justify="space-between" align="start" gap={8} wrap style={{ marginTop: 10 }}>
            <PaceLine budget={totalBudget} progress={totalProgress} solid />
            {totalPeriod !== "daily" && <Typography.Text style={{ fontSize: 12, ...muted }}>{totalProgress.daysLeft} {totalProgress.daysLeft === 1 ? "day" : "days"} left</Typography.Text>}
          </Flex>
          <Typography.Text style={{ display: "block", fontSize: 11, marginTop: 8, ...muted }}>A record that fits more than one budget is counted in each.</Typography.Text>
          </div>
        </Card>}
        {budgets.length === 0 ? <Card><EmptyState title="No budgets yet" description="Set a spending limit, like ₱10,000 a month for food, and see if you're on pace to stay within it." action={<Button type="primary" icon={<PlusOutlined />} disabled={disabled} onClick={() => setEditing(blank())}>Add budget</Button>} /></Card> : <>
          <Flex align="center" justify="space-between" gap={12} wrap style={{ marginBottom: 16 }}>
            <Flex gap={8} wrap>
              {([["on-track", CheckCircleOutlined, "on track"], ["at-risk", ExclamationCircleOutlined, "at risk"], ["over", WarningOutlined, "over budget"]] as const).map(([status, Icon, label]) => {
                const count = counts[status];
                const tint = count ? statusColor(status) : undefined;
                const toggle = () => setStatusChoice(statusFilter === status ? null : status);
                const style: CSSProperties = tint
                  ? { borderColor: tint, cursor: "pointer", opacity: statusFilter && statusFilter !== status ? 0.45 : 1 }
                  : { color: token.colorTextQuaternary, borderColor: token.colorBorderSecondary, background: token.colorFillQuaternary };
                return <Tag key={status} className="status-tag" color={tint} icon={<Icon />} role={count ? "button" : undefined} tabIndex={count ? 0 : undefined} aria-pressed={count ? statusFilter === status : undefined}
                  onClick={count ? toggle : undefined} onKeyDown={count ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); } } : undefined}
                  style={{ marginInlineEnd: 0, transition: "opacity 150ms ease", ...style }}>{count} {label}</Tag>;
              })}
              {statusFilter && <Tag className="status-tag" icon={<CloseOutlined />} role="button" tabIndex={0} aria-label="Clear status filter" onClick={() => setStatusChoice(null)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setStatusChoice(null); } }}
                style={{ marginInlineEnd: 0, cursor: "pointer", border: `1px solid ${token.colorTextTertiary}` }}>Clear</Tag>}
            </Flex>
            <Flex align="center" gap={8}>
            <Segmented size="small" aria-label="Budget view" value={view} onChange={(value) => { setView(value as "cards" | "list"); saveView(value as "cards" | "list"); }} options={[{ value: "cards", icon: <AppstoreOutlined />, title: "Cards" }, { value: "list", icon: <UnorderedListOutlined />, title: "List" }]} />
            {budgets.length > 1 && <Tip title={locked ? "Unlock to reorder budgets" : "Lock budget order"}>
              <Button type="text" size="small" aria-label={locked ? "Unlock budget order" : "Lock budget order"} aria-pressed={locked} icon={locked ? <LockOutlined /> : <UnlockOutlined />} disabled={disabled}
                onClick={() => { if (user) void setFinanceBudgetsLocked(user.uid, !locked).catch(() => message.error("Could not update the lock.")); }}
                style={{ color: locked ? token.colorPrimary : token.colorTextSecondary }} />
            </Tip>}
            </Flex>
          </Flex>
          {view === "list" ? <Flex vertical gap={10}>
            <SortableList
              ids={visibleIds}
              layout="list"
              disabled={disabled || locked || !!statusFilter}
              onReorder={reorder}
              renderOverlay={(id) => { const budget = byId.get(id); return budget ? <div style={{ ...surface(budget), padding: "12px 16px", borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowSecondary }}>{listBody(budget)}</div> : null; }}
              renderItem={(id, { ref, style, handlers, wasDragged }) => {
                const budget = byId.get(id);
                if (!budget) return null;
                return (
                  <div key={id} ref={ref} {...handlers} className={`reorder-item budget-card${states.get(budget.id)?.progress.status === "over" ? " budget-card-over" : ""}`} role="button" tabIndex={0} aria-label={`${budget.name} budget. Press Enter to see records${locked || statusFilter ? "" : ", or Space to pick up and reorder"}.`}
                    onClick={() => { if (!wasDragged()) setOpenId(budget.id); }}
                    onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setOpenId(budget.id); } else handlers.onKeyDown?.(event); }}
                    style={{ ...surface(budget), ...style, padding: "12px 16px", borderRadius: token.borderRadiusLG, "--card-ring": token.colorText } as CSSProperties}>
                    {listBody(budget)}
                  </div>
                );
              }}
            />
          </Flex> : (
          <div style={{ display: "grid", gridTemplateColumns: screens.sm === false ? "minmax(0, 1fr)" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            <SortableList
              ids={visibleIds}
              layout="grid"
              disabled={disabled || locked || !!statusFilter}
              onReorder={reorder}
              renderOverlay={(id) => { const budget = byId.get(id); return budget ? <Card size="small" style={{ ...surface(budget), boxShadow: token.boxShadowSecondary }}>{cardBody(budget)}</Card> : null; }}
              renderItem={(id, { ref, style, handlers, wasDragged }) => {
                const budget = byId.get(id);
                if (!budget) return null;
                return (
                  <Card key={id} ref={ref} size="small" {...handlers} className={`reorder-item budget-card${states.get(budget.id)?.progress.status === "over" ? " budget-card-over" : ""}`} role="button" tabIndex={0} aria-label={`${budget.name} budget. Press Enter to see records${locked || statusFilter ? "" : ", or Space to pick up and reorder"}.`}
                    onClick={() => { if (!wasDragged()) setOpenId(budget.id); }}
                    onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setOpenId(budget.id); } else handlers.onKeyDown?.(event); }}
                    style={{ ...surface(budget), ...style, minWidth: 0, boxShadow: token.boxShadowTertiary, "--card-ring": token.colorText } as CSSProperties}>
                    {cardBody(budget)}
                  </Card>
                );
              }}
            />
          </div>
          )}
        </>}
      </>}
      {editing && <BudgetModal key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
      {openBudget && <BudgetRecordsModal key={openBudget.id} budget={openBudget} onClose={() => setOpenId(null)} />}
      {recordOpen && <FinanceRecordModal onClose={() => setRecordOpen(false)} onSaved={() => {}} />}
    </div>
  );
}
