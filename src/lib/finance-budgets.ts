import type { FinanceAccount, FinanceRecord } from "@/lib/finance";

export const BUDGET_PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];
export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

export type FinanceBudget = { id: string; name: string; color: string; icon: string; amountMinor: number; currency: string; period: BudgetPeriod; categoryIds: string[]; accountIds: string[]; labels: string[]; fixed: boolean; order: number };

export type BudgetScope = { categoryIdsOf: (category: string) => string[]; defaultAccountIds: Set<string> };

const DAY = 86_400_000;
const parse = (key: string) => Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
const format = (time: number) => new Date(time).toISOString().slice(0, 10);

export function daysInclusive(start: string, end: string) {
  return Math.round((parse(end) - parse(start)) / DAY) + 1;
}

export function budgetPeriodBounds(period: BudgetPeriod, today: string, offset = 0) {
  const time = parse(today);
  const date = new Date(time);
  if (period === "daily") {
    const day = format(time + offset * DAY);
    return { start: day, end: day };
  }
  if (period === "weekly") {
    const start = time - ((date.getUTCDay() + 6) % 7) * DAY + offset * 7 * DAY;
    return { start: format(start), end: format(start + 6 * DAY) };
  }
  if (period === "monthly") {
    const index = date.getUTCFullYear() * 12 + date.getUTCMonth() + offset;
    const year = Math.floor(index / 12);
    const month = index % 12;
    return { start: format(Date.UTC(year, month, 1)), end: format(Date.UTC(year, month + 1, 0)) };
  }
  const year = date.getUTCFullYear() + offset;
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function budgetMatches(budget: FinanceBudget, record: Pick<FinanceRecord, "type" | "currency" | "accountId" | "category" | "labels">, scope: BudgetScope) {
  if (record.type !== "expense" || record.currency !== budget.currency) return false;
  if (budget.accountIds.length ? !budget.accountIds.includes(record.accountId) : !scope.defaultAccountIds.has(record.accountId)) return false;
  if (budget.categoryIds.length && !scope.categoryIdsOf(record.category).some((id) => budget.categoryIds.includes(id))) return false;
  if (budget.labels.length && !record.labels.some((label) => budget.labels.includes(label))) return false;
  return true;
}

export function budgetRecords<T extends Pick<FinanceRecord, "type" | "currency" | "accountId" | "category" | "labels" | "date">>(budget: FinanceBudget, records: T[], start: string, end: string, scope: BudgetScope) {
  return records.filter((record) => record.date >= start && record.date <= end && budgetMatches(budget, record, scope));
}

export type BudgetStatus = "on-track" | "at-risk" | "over" | "under";

export function budgetProgress(budget: Pick<FinanceBudget, "amountMinor" | "period" | "fixed">, spentMinor: number, start: string, end: string, today: string, unitMinor: number) {
  const total = daysInclusive(start, end);
  const current = today >= start && today <= end;
  const past = today > end;
  const elapsed = current ? daysInclusive(start, today) : past ? total : 0;
  const daysLeft = current ? daysInclusive(today, end) : 0;
  const leftMinor = budget.amountMinor - spentMinor;
  const dailyAllowanceMinor = daysLeft > 0 && leftMinor > 0 ? Math.floor(leftMinor / daysLeft / unitMinor) * unitMinor : 0;
  const expectedMinor = Math.round((budget.amountMinor * elapsed) / total);
  const projectedMinor = elapsed > 0 ? Math.round((spentMinor * total) / elapsed) : spentMinor;
  const paced = current && budget.period !== "daily" && !budget.fixed;
  const status: BudgetStatus = spentMinor > budget.amountMinor ? "over" : past ? "under" : paced && projectedMinor > budget.amountMinor ? "at-risk" : "on-track";
  return {
    total,
    elapsed,
    daysLeft,
    current,
    past,
    leftMinor,
    dailyAllowanceMinor,
    expectedMinor,
    projectedMinor,
    paced,
    early: paced && elapsed / total < 0.15,
    status,
    ratio: budget.amountMinor > 0 ? spentMinor / budget.amountMinor : 0,
  };
}

export function budgetValidation(budget: FinanceBudget, accounts: FinanceAccount[]) {
  const name = budget.name.trim();
  if (!name || name.length > 60) return "Enter a budget name of up to 60 characters.";
  if (!/^#[0-9a-f]{6}$/i.test(budget.color)) return "Choose a six-digit hexadecimal color.";
  if (!budget.icon || budget.icon.length > 60) return "Choose an icon.";
  if (!Number.isSafeInteger(budget.amountMinor) || budget.amountMinor <= 0) return "Enter an amount greater than zero.";
  if (!BUDGET_PERIODS.includes(budget.period)) return "Choose a period.";
  if (!/^[A-Z]{3}$/.test(budget.currency)) return "Choose a currency.";
  if (budget.categoryIds.length > 100 || budget.accountIds.length > 50 || budget.labels.length > 50) return "Pick fewer categories, accounts or labels.";
  for (const id of budget.accountIds) {
    const account = accounts.find((item) => item.id === id);
    if (!account || account.deletedAt || account.type === "Debt") return "Choose your own accounts.";
    if (account.currency !== budget.currency) return "All accounts in a budget must use the same currency.";
  }
  if (!Number.isFinite(budget.order)) return "Enter a valid order.";
  return null;
}
