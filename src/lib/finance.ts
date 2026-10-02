export const ACCOUNT_TYPES = ["Cash", "Bank account", "Savings", "Credit card", "Investment", "Loan", "Other"];
export const CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "HKD", "SGD", "KRW", "INR", "AED", "NZD"];
export const CATEGORIES = ["Food & drink", "Shopping", "Housing", "Transportation", "Health", "Entertainment", "Education", "Bills", "Salary", "Gifts", "Other"];
export type FinanceAccount = { id: string; name: string; color: string; type: string; initialMinor: number; balanceMinor: number; currency: string; excludeFromStatistics: boolean; deletedAt?: string };
export type FinanceRecord = { id: string; type: "expense" | "income" | "transfer"; amountMinor: number; accountId: string; destinationId: string | null; currency: string; category: string; labels: string[]; date: string; occurredAt: string; description: string };

export function currencyDigits(currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function toMinor(amount: number, currency: string) {
  return Math.round(amount * 10 ** currencyDigits(currency));
}

export function money(minor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 10 ** currencyDigits(currency));
}

export function accountTextColor(color: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const background = luminance(color);
  const dark = "#172019";
  return 1.05 / (background + 0.05) >= (background + 0.05) / (luminance(dark) + 0.05) ? "#ffffff" : dark;
}

export function accountValidation(account: FinanceAccount) {
  if (!account.name.trim() || account.name.trim().length > 80) return "Enter an account name of up to 80 characters.";
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
