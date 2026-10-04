export const ACCOUNT_TYPES = ["Cash", "Bank account", "Savings", "Credit card", "Investment", "Loan", "Other"];
export const CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "HKD", "SGD", "KRW", "INR", "AED", "NZD"];
export const CATEGORIES = ["Food & drink", "Shopping", "Housing", "Transportation", "Health", "Entertainment", "Education", "Bills", "Salary", "Gifts", "Other"];
export type FinanceAccount = { id: string; name: string; color: string; type: string; initialMinor: number; balanceMinor: number; currency: string; excludeFromStatistics: boolean; provider?: string; order?: number; deletedAt?: string };
export type FinanceRecord = { id: string; type: "expense" | "income" | "transfer"; amountMinor: number; accountId: string; destinationId: string | null; currency: string; category: string; labels: string[]; date: string; occurredAt: string; description: string };

export function sortAccounts(accounts: FinanceAccount[]) {
  return [...accounts].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name));
}

export function currencyDigits(currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function toMinor(amount: number, currency: string) {
  return Math.round(amount * 10 ** currencyDigits(currency));
}

export function money(minor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 10 ** currencyDigits(currency));
}

function apcaLuminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => (parseInt(hex.slice(start, start + 2), 16) / 255) ** 2.4);
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  return y > 0.022 ? y : y + (0.022 - y) ** 1.414;
}

function apcaContrast(text: string, background: string) {
  const t = apcaLuminance(text);
  const b = apcaLuminance(background);
  const contrast = b > t ? (b ** 0.56 - t ** 0.57) * 1.14 : (b ** 0.65 - t ** 0.62) * 1.14;
  return Math.abs(contrast) < 0.1 ? 0 : Math.abs(contrast) - 0.027;
}

export const EMERGENCY_FUND_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24];
export const DEFAULT_EMERGENCY_FUND_MONTHS = 6;

export function emergencyFundMonthsOrDefault(value: unknown) {
  return typeof value === "number" && EMERGENCY_FUND_MONTHS.includes(value) ? value : DEFAULT_EMERGENCY_FUND_MONTHS;
}

export function accountTextColor(color: string) {
  const dark = "#172019";
  return apcaContrast("#ffffff", color) >= apcaContrast(dark, color) ? "#ffffff" : dark;
}

export function accountValidation(account: FinanceAccount) {
  if (!account.name.trim() || account.name.trim().length > 80) return "Enter an account name of up to 80 characters.";
  if ((account.provider ?? "").trim().length > 120) return "Keep the provider under 120 characters.";
  if (!/^#[0-9a-f]{6}$/i.test(account.color)) return "Enter a six-digit hexadecimal color, such as #326647.";
  if (!ACCOUNT_TYPES.includes(account.type) || !CURRENCIES.includes(account.currency)) return "Choose a valid account type and currency.";
  if (!Number.isSafeInteger(account.initialMinor) || account.balanceMinor !== account.initialMinor) return "Enter a valid initial amount.";
  return null;
}

export function recordValidation(record: FinanceRecord, accounts: FinanceAccount[]) {
  const account = accounts.find((item) => item.id === record.accountId);
  if (!account || account.deletedAt || account.currency !== record.currency) return "Choose an account.";
  if (!["expense", "income", "transfer"].includes(record.type)) return "Choose a record type.";
  if (!Number.isSafeInteger(record.amountMinor) || record.amountMinor <= 0) return "Enter an amount greater than zero.";
  if (!Number.isFinite(Date.parse(record.occurredAt)) || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) return "Choose a valid date and time.";
  const date = new Date(`${record.date}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== record.date) return "Choose a valid date and time.";
  if (record.type === "transfer") {
    const destination = accounts.find((item) => item.id === record.destinationId);
    if (!destination || destination.deletedAt || destination.id === account.id || destination.currency !== account.currency) return "Transfers require two different accounts with the same currency.";
  } else if (!record.category.trim()) return "Choose a category.";
  if (record.category.length > 80 || record.description.length > 2000 || record.labels.some((label) => !label.trim() || label.length > 60) || record.labels.length > 20) return "Keep categories under 80 characters, labels under 60 characters (up to 20), and descriptions under 2,000 characters.";
  if (balanceChanges(record).some(([id, change]) => !Number.isSafeInteger((accounts.find((item) => item.id === id)?.balanceMinor ?? NaN) + change))) return "This record would exceed the supported account balance.";
  return null;
}

export function balanceChanges(record: FinanceRecord): [string, number][] {
  if (record.type === "transfer") return [[record.accountId, -record.amountMinor], [record.destinationId!, record.amountMinor]];
  return [[record.accountId, record.type === "income" ? record.amountMinor : -record.amountMinor]];
}

export function rebuiltBalance(account: FinanceAccount, records: FinanceRecord[]) {
  return records.reduce((sum, record) => sum + balanceChanges(record).filter(([id]) => id === account.id).reduce((total, [, amount]) => total + amount, 0), account.initialMinor);
}

export function financeStatistics(records: FinanceRecord[], accounts: FinanceAccount[]) {
  const totals: Record<string, { income: number; expense: number }> = {};
  for (const record of records) {
    const account = accounts.find((item) => item.id === record.accountId);
    if (!account || account.deletedAt || account.excludeFromStatistics || record.type === "transfer") continue;
    const total = totals[record.currency] ??= { income: 0, expense: 0 };
    total[record.type] += record.amountMinor;
  }
  return totals;
}
